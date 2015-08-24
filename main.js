var population = require('population');

for ( var i in Game.rooms) {
	var curRoom = Game.rooms[i];

	// Every 300 seconds check the population
	if (!(Game.time % 180)) {
		// console.log("Updating population tracking for room " + i);
		curRoom.memory.currentPopulation = population.census(curRoom);
		population.printDemographics(curRoom);
	}
	// Check unit production every 10 seconds
	if (!(Game.time % 10)) {
		population.breed(curRoom);
	}
}

// Prototype extensions
Structure.prototype.needsRepair = function(name) {
	return this.hits < this.hitsMax * .8;
};
