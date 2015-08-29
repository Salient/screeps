var population = require('population');
var taskMaster = require('tasker');
// Creep.prototype.tasktest = [];
// Creep.memoryzzz.addTask = function(task) {

Creep.prototype.tasktest = function(test) {
	this.memory.wowza = [ 1, 2, test ];

	console.log("i have a prototype");
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

	if (!(Game.time % 2)) { // Check if this actually does nothing every other
		// tick
		taskMaster.taskMinions(curRoom);
	}

	// Update population tracking for each room for creeps that were killed or
	// died of old age.
	if (!(Game.time % 31)) {
		// console.log("Updating population tracking for room " + i);
		curRoom.memory.currentPopulation = population.census(curRoom);
		population.printDemographics(curRoom);
	}
	// Check unit production every 10 seconds
	if (!(Game.time % 11)) {
		population.breed(curRoom);
	}
}
function dlog(msg) {
	console.log("[DEBUG MAIN] " + msg);
}
// Housekeeping
// Delete old memory entries
if (!(Game.time % 30)) {
	dlog("Housekeeping");
	for ( var ghost in Memory.creeps) {
		if (typeof Game.creeps.ghost === 'undefined') {
			// delete (Memory.creeps[ghost]);
			dlog('possible ghost found: ' + ghost.name);
		}
	}
}

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

// Returns a valid path to the structure, or null?
Creep.prototype.checkPath = function(structure) {
	return path = this.room.findPath(this.pos, structure);
}
