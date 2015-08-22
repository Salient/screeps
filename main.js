var harvester = require('harvester');
var upgrader = require('upgrader');
var population = require('population');
var guard = require('guard');
var builder = require('builder');
var creepUtil = require('creepUtility');

console.log('Dumping roles');
var myPeople = population.census();

for (var i in myPeople) {
	var role = myPeople[i];
	console.log(role.name);
}

// Every tick update creep logic
for(var name in Game.creeps) {
  var creep = Game.creeps[name];

  if(creep.memory.role == 'harvester') {
    harvester(creep);
  }

  if(creep.memory.role == 'upgrade') {
      upgrader(creep);
  }
  if(creep.memory.role == 'guard') {
        guard(creep);
    }
  if(creep.memory.role == 'builder') {
        builder(creep);
  }
}


// Every 30 seconds update housekeeping things
if (Game.time % 10 == 0) {
    population.tick();
} else if (Game.time % 11 == 0) {
    creepUtil.zapZombies();
}




// Prototype extensions
Structure.prototype.needsRepair = function(name) {
    return this.hits < this.hitsMax * .8;
};


