var upgrader = require('upgrader');
var workerBee = require('harvester');

module.exports = function(creep) {
	if (creep.carry.energy === 0) {
		var nearStructures = creep.room.find(FIND_MY_STRUCTURES);
		for ( var s in nearStructures) {
			var structure = nearStructures[s];
			if (structure.structureType == 'STRUCTURE_EXTENSION') {
				// console.log('looking for energy in structure ' + s);
			}
			if (structure.energy > 0) {
				creep.moveTo(structure);
				structure.transferEnergy(creep);
				return;
			}
		}
		// If we are here, seems there is no extension with energy
		workerBee(creep);
		return;
	}

	if ((creep.memory.myTargetId == null)
			|| typeof Game.structures[creep.memory.myTargetId] === 'undefined') {

		creep.memory.myTargetId = newTarget(creep);
		// console.log('New Target for ' + creep.name + ': '
		// + creep.memory.myTargetId);
	}

	var target = Game.getObjectById(creep.memory.myTargetId);
	if (target === null) {
		// console.log('No target, temporary upgarder');
		upgrader(creep);
		return;
	}

	if (!creep.pos.isNearTo(target)) {
		creep.moveTo(target);
	}

	// Is a construction site
	if (target.progress >= 0) {
		if (target.progress < target.progressTotal) {
			if (creep.pos.isNearTo(target)) {
				creep.say(completedPretty(target) + '%');
				creep.build(target);
			}
		} else {
			// console.log('clearing target ' + creep.name + ' target: '
			// + target.structureType + ' ' + target.progress + '/'
			// + target.progressTotal);
			creep.memory.myTargetId = null;
		}
		return;
	}

	if (needsRepair(target)) {
		if (creep.pos.isNearTo(target)) {
			creep.say(completedPretty(target) + '%');
			creep.repair(target);
		}
	} else {
		// console.log('clearing target ' + creep.name + ' target: '
		// + target.structureType + ' ' + target.hits + '/'
		// + target.hitsMax);
		creep.memory.myTargetId = null;
	}

}

function needsRepair(target) {
	// console.log('needs repair? ' + target.hits + '/' + target.hitsMax);
	return target.hits < (target.hitsMax / 2);
}

function newTarget(creep) {

	var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES), site = null, target = null;

	if (constructionSites.length) {
		site = constructionSites[Math.floor((Math.random() * 10)
				% constructionSites.length)]; // Try to spread out
		// construction a bit to make
		// pathing easier
	}

	var structures = creep.room.find(FIND_STRUCTURES);
	var options = [];

	for ( var i in structures) {
		var s = structures[i];

		// Check if path exists!! Otherwise, builders can block each other
		var path = creep.moveTo(s);
		if (path) {
			continue; // Can't do it for some reason.
		}
		if (creep) {
			if (s.hits === null) {
				continue;
			} else if (needsRepair(s)) {
				if (s.structureType === STRUCTURE_RAMPART) {
					if (target !== null
							&& (target.structureType == STRUCTURE_RAMPART)
							&& (target.hits < s.hits)) {
						continue;
					}
					target = s;
				}
				if ((s.structureType == STRUCTURE_ROAD)
						&& (target === null || (target.structureType != STRUCTURE_RAMPART))) {
					target = s;
				}
				if (target === null
						|| ((s.structureType == STRUCTURE_WALL) && (target === null || ([
								STRUCTURE_RAMPART, STRUCTURE_ROAD ]
								.indexOf(target.structureType) == -1)))) {
					target = s;
				}
			}
		}
	}

	if (target === null && site !== null) {
		return site.id;
	} else if (target !== null && (target.hits < (target.hitsMax / 4))) {
		return target.id;
	} else if (site !== null) {
		return site.id;
	} else if (target !== null) {
		return target.id;
	}
	// console.log('failed to find target');
	return null;
}

function completedPretty(target) {
	if (target.hits !== null) {
		return parseInt((target.hits / target.hitsMax) * 100);
	}
	return parseInt((target.progress / target.progressTotal) * 100);
}
