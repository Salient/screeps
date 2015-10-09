var util = require('common');
var harvest = require('harvester'); // useful for energy finding routines

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

Structure.prototype.needsRepair = function(name) {
	return this.hits < this.hitsMax * .8;
};

module.exports = function(creep) {
	// Take a look around the room for something to do

	if (!util.def(creep.memory.targetList)) {

		creep.memory.targetList = [];
	}

	var hitList = creep.memory.targetList;
	if (hitList.length == 0) {
		// priority list

		repairDuty(creep)
		constructionDuty(creep);
		upgradeController(creep)
	}

	var target = Game.getObjectById(hitList[hitList.length - 1]);

	// Is a construction site
	if (util.def(target.progress)) {
		if (target.progress < target.progressTotal) {
			if (creep.pos.isNearTo(target) && (creep.carry.energy > 0)) {
				creep.say(sayProgress(target) + '%');
				var res = creep.build(target);
				if (res < 0) {
					dlog('Error building ' + target.structureType + ': '
							+ util.getError(res))
					if ((res == -7) || (res == -14)) {
						// clear target
						dlog(creep.name + ' clearing target ' + target.id)
						creep.memory.targetList.pop();
					}
				}
			} else if (creep.carry.energy == creep.carryCapacity) {
				creep.moveTo(target);
			} else {
				fillTank(creep);
			}
		} else {
			// console.log('clearing target ' + creep.name + ' target: '
			// + target.structureType + ' ' + target.progress + '/'
			// + target.progressTotal);
			dlog(creep.name + ' clearing target ' + target.id)
			creep.memory.targetList.pop();
		}
		return

		

				

	}

	if (util.def(target.hits)) {

		if (needsRepair(target)) {
			if (creep.pos.isNearTo(target)) {
				creep.say(sayProgress(target) + '%');
				creep.repair(target);
			}
		} else {
			// console.log('clearing target ' + creep.name + ' target: '
			// + target.structureType + ' ' + target.hits + '/'
			// + target.hitsMax);
			dlog(creep.name + ' clearing target ' + target.id)
			creep.memory.targetList.pop();
		}
	}

}

var buildExtension = function(creep) {

	var numExts = 0;
	var structs = creep.room.find(FIND_CONSTRUCTION_SITES);

	for ( var site in structs)
		var plot = structs[site]

	if (plot.structureType == STRUCTURE_EXTENSION) {

	}

}

function dlog(msg) {
	util.dlog('CONSTRUCTION', msg);
}

function needsRepair(target) {
	// console.log('needs repair? ' + target.hits + '/' + target.hitsMax);
	return target.hits < (target.hitsMax / 2);
}

function repairDuty(creep) {
	debugger
	var structures = Game.rooms.sim.find(FIND_MY_STRUCTURES)

	if (structures.length) {
		// sort in order of most damage
		structures.sort(function(a, b) {
			var ahurt = a.hits / a.hitsMax
			var bhurt = b.hits / b.hitsMax

			if (a < b) {
				return -1

			}
			if (a > b) {
				return 1

			}
			if (a == b) {
				return 0

			}
		})

		for ( var i in structures) {
			var s = structures[i];

			if (s.hits < s.hitsMax * .8) {
				creep.targetList.push(s.id)
			}
		}
	}
}

function constructionDuty(creep) {

	var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES), site = null, target = null;

	if (constructionSites.length) {
		for ( var site in constructionSites) {
			var s = constructionSites[site]
			creep.memory.targetList.push(s.id)
		}
	} else {
		upgradeController(creep)
	}

	// //
	// // var structures = creep.room.find(FIND_STRUCTURES);
	// // var options = [];
	//
	// for ( var i in constructionSites) {
	// var s = constructionSites[i];
	//
	// // Check if path exists!! Otherwise, builders can block each other
	// var path = creep.moveTo(s);
	// if (path) {
	// continue; // Can't do it for some reason.
	// }
	// if (creep) {
	// if (s.hits === null) {
	// continue;
	// } else if (needsRepair(s)) {
	// if (s.structureType === STRUCTURE_RAMPART) {
	// if (target !== null
	// && (target.structureType == STRUCTURE_RAMPART)
	// && (target.hits < s.hits)) {
	// continue;
	// }
	// target = s;
	// }
	// if ((s.structureType == STRUCTURE_ROAD)
	// && (target === null || (target.structureType != STRUCTURE_RAMPART))) {
	// target = s;
	// }
	// if (target === null
	// || ((s.structureType == STRUCTURE_WALL) && (target === null || ([
	// STRUCTURE_RAMPART, STRUCTURE_ROAD ]
	// .indexOf(target.structureType) == -1)))) {
	// target = s;
	// }
	// }
	// }
	// }
	//
	// if (target === null && site !== null) {
	// return site.id;
	// } else if (target !== null && (target.hits < (target.hitsMax / 4))) {
	// return target.id;
	// } else if (site !== null) {
	// return site.id;
	// } else if (target !== null) {
	// return target.id;
	// }
	// // console.log('failed to find target');
	// return null;
}

module.exports.constructionDuty = constructionDuty;
module.exports.upgradeController = upgradeController;

function upgradeController(creep) {

	var rc = creep.room.controller;

	if (creep.pos.isNearTo(rc) && (creep.carry.energy > 0)) {
		creep.say(sayProgress(rc) + "%");
		creep.upgradeController(rc);
	} else if (creep.carry.energy == creep.carryCapacity) {
		creep.moveTo(rc);
	} else {
		fillTank(creep);
	}

}

function fillTank(creep) {
	var structs = creep.room.find(FIND_MY_STRUCTURES);

	creep.say('Filling up my tank');

	if (creep.carry.energy < creep.carryCapacity) {
		harvest.scrounge(creep);
		for ( var i in structs) {
			var struct = structs[i];
			if ((struct.structureType == STRUCTURE_EXTENSION)
					|| (struct.structureType == 'spawn')
					|| (struct.structureType == STRUCTURE_STORAGE)) {

				if (struct.energy > 0) {
					creep.moveTo(struct);
					if (creep.pos.isNearTo(struct)) {
						struct.transferEnergy(creep);
					}
				}
			}
		}
	}
}

function sayProgress(target) {

	if (util.def(target.progress)) {
		return parseInt((target.progress / target.progressTotal) * 100);
	} else if (util.def(target.hits)) {
		return parseInt((target.hits / target.hitsMax) * 100);
	}
}
