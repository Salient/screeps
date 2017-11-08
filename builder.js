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

Structure.prototype.needsRepair = function() {
	return this.hits < this.hitsMax * .8;
};

Structure.prototype.isDone = function() {
	return (this.hits == this.hitsMax);
};

var buildExtension = function(creep) {

	var numExts = 0;
	var structs = creep.room.find(FIND_MY_STRUCTURES);
	structs.forEach(function(s) {
		if (structs[s].structureType == 'STRUCTURE_EXTESION') {
			numExts++;
		}
	});

	var maxExts = creep.room.memory.maxExts;
	if (typeof maxExts !== 'undefined') {
		if (numExts < maxExts) {

			// build ext.
		}
	}
}

function dlog(msg) {
	util.dlog('CONSTRUCTION', msg);
}

module.exports = function(creep) {
	// Take a look around the room for something to do

	// If we are here, seems there is no extension with energy
	// workerBee(creep);
	// return;

	var targetId = creep.memory.myTargetId
	if (!util.def(targetId) || !util.def(Game.getObjectById(targetId))) {

		creep.memory.myTargetId = constructionDuty(creep) || repairDuty(creep)
		if (!util.def(creep.memory.myTargetId)) {
			dlog(creep.name + ' says nothing to build or repair')
			return false;
		}
		// console.log('New Target for ' + creep.name + ': '
		// + creep.memory.myTargetId);
	}

	var target = Game.getObjectById(creep.memory.myTargetId);

	// check if done
	if (util.def(target.hits) && (target.hits == target.hitsMax)) {
		targetId = null
		creep.say('Done!')
		return true;
	}

	if (target.progress >= 0) {

		if ((creep.pos.isNearTo(target)) && (creep.carry.energy > 0)) {
			creep.say(sayProgress(target) + '%');
			creep.build(target)
			return true;

		} else if (creep.carry.energy == creep.carryCapacity) {
			creep.moveTo(target);
			return true;

		} else {
			fillTank(creep);
			return true;

		}

	} else if (needsRepair(target)) {

		if ((creep.pos.isNearTo(target)) && (creep.carry.energy > 0)) {
			creep.say(sayProgress(target) + '%');
			creep.repair(target)
			return true;

		} else if (creep.carry.energy == creep.carryCapacity) {
			creep.moveTo(target);
			return true;

		} else {
			fillTank(creep);
			return true;

		}

	} else {
		// console.log('clearing target ' + creep.name + ' target: '
		// + target.structureType + ' ' + target.hits + '/'
		// + target.hitsMax);
		dlog('builder unsure what to do with target ' + target.id)
	}
}

function needsRepair(target) {
	// console.log('needs repair? ' + target.hits + '/' + target.hitsMax);
	return target.hits < (target.hitsMax / 2);
}

function repairDuty(creep) {

	var structures = creep.room.find(FIND_STRUCTURES);
	var options = [];

	// TODO: can I sort structures in order of damage?
	for ( var i in structures) {
		var s = structures[i];

		var intendedPath = creep.checkPath(s);
		// Check if path exists!! Otherwise, builders can block each other

		if (s.hits === null) {
			continue;
		}

		if (s.needsRepair()) {
			creep.moveTo(s);
			creep.repair(s);
		}
	}
}

function constructionDuty(creep) {

	// TODO: make this part of the room survey and avoid search every tick
	var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES), site = null, target = null;

	// if (constructionSites.length) {
	// site = constructionSites[Math.floor((Math.random() * 10)
	// % constructionSites.length)]; // Try to spread out
	// // construction a bit to make
	// // pathing easier
	// } else {
	// return null;
	//
	// }

	dlog(creep.name + ' on construction duty')

	if (!util.def(constructionSites) || (constructionSites.length == 0)) {
		// nothing to build?
		return false
	}

	// Build priority
	var buildPriority = {
		'spawn' : 1,
		'storage' : 2,
		'link' : 3,
		'extension' : 4,
		'road' : 5,
		'rampart' : 6,
		'constructedWall' : 7
	}

	constructionSites
			.sort(function(a, b) {

				if (buildPriority[a.structureType] < buildPriority[b.structureType]) {
					return -1

				} else if (buildPriority[a.structureType] > buildPriority[b.structureType]) {
					return 1;
				} else {
					return 0
				}
			})

	dlog('Priority list')
	for (var x = 0; x < 10; x++) {
		dlog(constructionSites[x].id)
	}
	constructionSites.reverse()
	dlog('flip round and revese it')
	for (var x = 0; x < 10; x++) {
		dlog(constructionSites[x].id)
	}

	// Check if path exists!! Otherwise, builders can block each other
	for ( var index in constructionSites) {
		var target = constructionSites[index]

		var path = creep.moveTo(target);

		if (path != 0) {
			continue; // Can't do it for some reason.
		} else {
			return target.id
		}
	}

	return null
	//	
	// var structures = creep.room.find(FIND_STRUCTURES);
	// var options = [];
	//
	// for ( var i in structures) {
	// var s = structures[i];
	//
	// // Check if path exists!! Otherwise, builders can block each other
	// var path = creep.moveTo(s);
	// if (path) {
	// continue; // Can't do it for some reason.
	// }
	// if (s) {
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
module.exports.upgradeRC = upgradeRC;

function upgradeRC(creep) {

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
		harvest.scrounge(creep, 'sweep');
		for ( var i in structs) {
			var struct = structs[i];
			if ((struct.structureType == STRUCTURE_EXTENSION)
					|| (struct.structureType == 'spawn')
					|| (struct.structureType == STRUCTURE_STORAGE)) {

				if (struct.energy > 0) {
					creep.moveTo(struct);
					if (creep.pos.isNearTo(struct)) {
						creep.withdraw(struct); 
					}
				}
			}
		}
	}
}

function sayProgress(target) {

	if (util.def(target.progress)) {
		return parseInt((target.progress / target.progressTotal) * 100);
	} else if (target.hits !== null) {
		return parseInt((target.hits / target.hitsMax) * 100);
	} else {
		dlog('say what?')
	}
}
