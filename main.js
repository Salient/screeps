var population = require('population');
var taskMaster = require('tasker');
var roomstrat = require('strategy');
var util = require('common');

// Prototype extensions
Structure.prototype.needsRepair = function() {
	return this.hits < this.hitsMax * .8;
};

Structure.prototype.needsWorkers = function() {
	var attendees = this.memory.workers;
	var maxAttendees = this.memory.maxWorkers;

	if (typeof attendees === 'undefined') {
		attendees = 0;
	}

	if (typeof maxAttendees === 'undefined') {
		maxAttendees = 1; // If not defined, be conservative to prevent log
		// jams
	}
	var count = 0;
	attendees.sort();
	for ( var creep in attendees) {
		if (attendees[creep].hits > 0) {
			count++;
		} else {
			destroy(attendees[creep]);
		}
	}
}

Room.prototype.getLevel = function() {
	return this.controller.level;
}

Room.prototype.getError = function(msg) {
	return (util.getError(msg));
}
Creep.prototype.getError = function(msg) {
	return (util.getError(msg));
}

Room.prototype.popCount = function() {
	return this.find(FIND_MY_CREEPS).length
}

// Returns a valid path to the structure, or null?
Creep.prototype.checkPath = function(structure) {
	return path = this.room.findPath(this.pos, structure);
}

// Quickstart for sims
if (Game.time <= 20) {
	// skip timeouts
	roomstrat.strategery(Game.rooms.sim);
}
// Welcome to the HiveMind (v0.1)
// Basic aim is to build up a room, fortify, and then spawn into adjacent rooms.
// If vacant, rinse and repeat.
// Still need to code invasion and global smarts

// For now, we will cycle through all the rooms we own and apply the same basic
// instructions to each
// Different logic functions are spread out to keep per tick load down
// Basically, modulus by some prime numbers to minimize multiple functions
// together
for ( var i in Game.rooms) {

	var curRoom = Game.rooms[i];

	// Needs to happen before population breeding, because it sets some
	// parameters. Should update every 61 seconds or so.
	if (!(Game.time % 20)) {
		roomstrat.strategery(curRoom);
	}

	// Update minion tasks every tick
	taskMaster.taskMinions(curRoom);

	// Update population tracking for each room for creeps that were killed or
	// died of old age.
	if (!(Game.time % 79)) {
		// console.log("Updating population tracking for room " + i);
		curRoom.memory.strategy.currentPopulation = population.census(curRoom);
		population.printDemographics(curRoom);
	}
	// Check unit production every 11 seconds. Demographics are configured by
	// strategy
	if (!(Game.time % 5)) {
		population.breed(curRoom);
	}

}

function dlog(msg) {
	util.dlog('MAIN', msg);
}
// Housekeeping
// Delete old memory entries
if (!(Game.time % 300)) {
	dlog("Housekeeping");

	for ( var i in Memory.creeps) {
		if (!Game.creeps[i]) {
			delete Memory.creeps[i];
		}
	}
}
