var harvester = require('harvester');
var upgrader = require('upgrader');
var population = require('population');
var guard = require('guard');
var builder = require('builder');
var creepUtil = require('creepUtility');


//var myPeople = population.census(Game.rooms.W7N9);
//
//for ( var i in myPeople) {
//	var role = myPeople[i];
//	console.log('There are ' + role.toString() + ' ' + i + 's');
//}

// Every tick update creep logic
for ( var name in Game.creeps) {
	var creep = Game.creeps[name];

	if (creep.memory.role == 'harvester') {
		builder(creep);
		harvester(creep);
	}

	if (creep.memory.role == 'upgrade') {
		upgrader(creep);
	}
	if (creep.memory.role == 'guard') {
		guard(creep);
	}
	if (creep.memory.role == 'builder') {
		builder(creep);
	}
}

// Every 300 seconds check the population
if (!Game.time % 300) {
	for ( var i in Game.rooms) {
		console.log("Updating population tracking for room " + i);
		var nextRoom = Game.rooms[i];
		nextRoom.memory.currentPopulation = population.census(nextRoom);
	}
} 

// Prototype extensions
Structure.prototype.needsRepair = function(name) {
	return this.hits < this.hitsMax * .8;
};
