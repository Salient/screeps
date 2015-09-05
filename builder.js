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

	if ((typeof Game.structures[creep.memory.myTargetId] === 'undefined')
			|| (creep.memory.myTargetId == null)) {

		creep.memory.myTargetId = constructionDuty(creep);
		// console.log('New Target for ' + creep.name + ': '
		// + creep.memory.myTargetId);
	}

	var target = Game.getObjectById(creep.memory.myTargetId);
	if (target === null) {
		// console.log('No target, temporary upgarder');
		upgradeController(creep);
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

	var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES), site = null, target = null;

	if (constructionSites.length) {
		site = constructionSites[Math.floor((Math.random() * 10)
				% constructionSites.length)]; // Try to spread out
		// construction a bit to make
		// pathing easier
	}
	return;
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

module.exports.constructionDuty = constructionDuty;
module.exports.upgradeController = upgradeController;

function upgradeController(creep) {

	var rc = creep.room.controller;

	if (creep.pos.isNearTo(rc) && (creep.carry.energy > 0)) {
		creep.say(completedPretty(rc) + "%");
		creep.upgradeController(rc);
	} else {
		fillTank(creep);
		creep.moveTo(rc);
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

function completedPretty(target) {
	if (target.hits !== null) {
		return parseInt((target.hits / target.hitsMax) * 100);
	}
	return parseInt((target.progress / target.progressTotal) * 100);
}
