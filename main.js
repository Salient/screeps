var harvester = require('harvester');
var upgrader = require('upgrader');
var population = require('population');
var guard = require('guard');
var builder = require('builder');
var creepUtil = require('creepUtility');

// var myPeople = population.census(Game.rooms.W7N9);
//
// for ( var i in myPeople) {
// var role = myPeople[i];
// console.log('There are ' + role.toString() + ' ' + i + 's');
// }

// Every tick update creep logic
for ( var name in Game.creeps) {
	var creep = Game.creeps[name];

	if (creep.memory.role == 'workerBee') {
		harvester(creep);
	}

	if (creep.memory.role == 'engineer') {
		upgrader(creep);
	}
	if (creep.memory.role == 'footSoldier') {
		guard(creep);
	}
	if (creep.memory.role == 'construction') {
		builder(creep);
	}
}

for ( var i in Game.rooms) {
	var nextRoom = Game.rooms[i];

	// Every 300 seconds check the population
	if (!(Game.time % 300)) {
		// console.log("Updating population tracking for room " + i);
		nextRoom.memory.currentPopulation = population.census(nextRoom);
	}
	// Check unit production every 10 seconds
	if (!(Game.time % 10)) {
		population.breed(nextRoom);
	}
}

// Prototype extensions
Structure.prototype.needsRepair = function(name) {
	return this.hits < this.hitsMax * .8;
};
