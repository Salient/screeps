var population = require('population');
var taskMaster = require('tasker');

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
	// died of old age
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

// Prototype extensions
Structure.prototype.needsRepair = function(name) {
	return this.hits < this.hitsMax * .8;
};

Room.prototype.getLevel = function() {
	return this.controller.level;
}