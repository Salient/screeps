var population = require('population');
var taskMaster = require('tasker');
var roomstrat = require('strategy');
var construct = require('cityPlanning');
var util = require('common');
var harvest = require('harvester');


// Prototype extensions
Game.f = function() {
	Game.rooms.sim.memory.clearFlags = 1
}
Game.p = function() {
	Game.rooms.sim.memory.halt = 0
}
Game.e = function() {
	construct.designRoom(Game.rooms.sim);
}

Room.prototype.getError = function(msg) {
	return (util.getError(msg));
}
Creep.prototype.getError = function(msg) {
	return (util.getError(msg));
}

// Returns a valid path to the structure, or null?
Creep.prototype.checkPath = function(structure) {
	return this.room.findPath(this.pos, structure);
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
for(var i in Memory.creeps) {
    if(!Game.creeps[i]) {
        delete Memory.creeps[i];
    }
}
	// Bootstrap check
	if (!util.def(curRoom.memory.strategy)) {
		roomstrat.strategery(curRoom);
		population.census(curRoom)
	}

	// Needs to happen before population breeding, because it sets some
	// parameters. Should update every 61 seconds or so.
	if (!(Game.time % 61)) {
		roomstrat.strategery(curRoom);
	}

	if (!(Game.time % 67)) {
		construct.designRoom(curRoom);
	}

	// Update minion tasks every tick
	taskMaster.taskMinions(curRoom);

	// if (!(Game.time % 47)) {
	// // Prune any creeps assigned to energy production who have died.
	// harvest.refreshArbiter(curRoom);
	// }

	// Update population tracking for each room for creeps that were killed or
	// died of old age.
	if (!(Game.time % 79)) {
		// console.log("Updating population tracking for room " + i);
		population.census(curRoom);
		population.printDemographics(curRoom);
	}
	// Check unit production every 11 seconds. Demographics are configured by
	// strategy
	if (!(Game.time % 1)) { // debug
		population.breed(curRoom);
	}

}

function dlog(msg) {
	util.dlog('MAIN', msg);
}

// Housekeeping
// Delete old memory entries
if (!(Game.time - 100 % 300)) { // Delay first housekeeping by 100 seconds to
	// allow other modules to initialize
	dlog("Housekeeping...");

	// Get list of creeps currently spawning so we don't brain wipe them
	var stormtroopers = {};
	for ( var spawn in Game.spawns) {
		if (util.def(spawn.spawning)) {
			stormtroopers[spawn.spawning.name] = true;
		}
	}

	for ( var i in Memory.creeps) {
		if (!Game.creeps[i]) {
			if (stormtroopers[spawn.spawning.name]) {
				dlog("these are not the droids you are looking for...");
			} else {
				dlog('die rebel scum');
				delete Memory.creeps[i];
			}
		}
	}

}
