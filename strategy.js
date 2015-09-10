/**
 * 
 */

var population = require('population');
var util = require('common');

Room.prototype.getLevel = function() {
	return this.controller.level;
}

// Basic strategy for building and fortifying a room
// Controller lvl 1
// --------------------
// Setup energy harvesting
// Create some low level soldiers
// Upgrade to lvl 2
// Controller lvl 2
// --------------------
// Create 5-6 extensions (need path checking)?
// Establish perimeter, build walls and ramparts
// fortify walls/ramparts
// upgrade to lvl3
// Controller lvl 3
// --------------------
// Create roads to source(s) and extensions
// Create beefier units, medics
// continue upgrading controller
// start scouting?
// Controller lvl 4
// --------------------
// Create energy storage
// Continue upgrading controller
// Controller lvl 5
// --------------------
// I don't know...never gotten this far.
// I suppose start creating links and have each room just store and transfer
// energy
// Move soldiers to outer rooms
//
//
// var population.design = {
// "miner" : [ WORK, WORK, MOVE ], Cost 300
// "workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ], cost 300
// "construction" : [ WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY ], cost 500,
// Can't build til lvl 2
// "engineer" : [ WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY ], cost 500
// ''
// "footSoldier" : [ TOUGH, ATTACK, MOVE, MOVE ], cost 190
// "cavalry" : [ TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK,
// ATTACK ]
// // TODO: ranged units, medics
// };
//
// var goalDemographics = { // unit types will be built in order listed
// "workerBee" : 0.4,
// "construction" : 0.25,
// "engineer" : 0.25,
// "footSoldier" : 0.1
// }
//
// var minDemographics = { // Help bootstrap early game population
// 'miner' : 3,
// 'workerBee' : 3,
// 'footSoldier' : 2
// }
//	

function dlog(msg) {
	util.dlog('STRATEGY', msg);
}

module.exports.strategery = function(room) {

	if (!util.def(room.memory.strategy)) {
		room.memory.strategy = {};
	}

	var roomConfig = room.memory.strategy;

	if (!util.def(roomConfig.curlvl)) {
		roomConfig.curlvl = 0;
	}
	if (!util.def(room.controller)) {
		dlog("No controller found in room. Strategy uncertain.");
		return;
	}
	if (roomConfig.curlvl != room.controller.level) {
		roomConfig.curlvl = room.controller.level;

		dlog('Room level has changed. Revising all strategery with level '
				+ roomConfig.curlvl + ' badassery.');

	}

	var selectStrat = [ bootstrap, lvl1room, lvl2room, lvl3room, lvl4room,
			lvl5room, lvl6room, lvl7room ];

	selectStrat[roomConfig.curlvl](room);
}

function lvl3room(room) {
}
function lvl4room(room) {
}
function lvl5room(room) {
}
function lvl6room(room) {
}
function lvl7room(room) {
}

function bootstrap(room) {
	if ((room.popCount()) >= 8) {
		// Enough bootstrapping, proceed to Phase II of the Plan
		return lvl1room(room);
	}
	// Set basic population control parameters
	var roomConfig = room.memory.strategy;

	roomConfig.latestModels = {
		'gatherer' : [ WORK, CARRY, MOVE ],
		"miner" : [ WORK, WORK, MOVE ],
		"scout" : [ ATTACK, ATTACK, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
		"technician" : [ MOVE, MOVE, WORK, CARRY, CARRY ]
	};

	// demographics control build order
	roomConfig.goalDemographics = {
		"gatherer" : 0.05,
		"scout" : 0.45,
		"miner" : 0.1,
		"workerBee" : 0.1,
		"technician" : 0.3
	}
	roomConfig.minDemographics = {
		"gatherer" : 1,
		"scout" : 4
	// Build two of these first thing
	}
	roomConfig.maxDemographics = {
		"gatherer" : 2,
		"scout" : 8,
		"workerBee" : 3,
		"miner" : 3,
	}
}

var lvl1room = function(room) {
	var roomConfig = room.memory.strategy;
	// Just checking if we can get off the ground properly
	if (room.popCount() < 6) {
		return bootstrap(room);
	}
	dlog('lvl1 proper, pop counted ' + room.popCount());
	// Setup population goals
	roomConfig.latestModels = {
		"miner" : [ WORK, WORK, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
		"private" : [ TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE ],
		"technician" : [ MOVE, MOVE, WORK, CARRY, CARRY ]
	};

	// demographics effect build order
	roomConfig.goalDemographics = {
		"miner" : 0.2,
		"workerBee" : 0.2,
		"private" : 0.5,
		"technician" : 0.6,
		"gatherer" : 0.05
	};

	roomConfig.minDemographics = {} // No mins, the goalDemo and max will
	// control build order this early in room
	roomConfig.maxDemographics = {
		"gatherer" : 2,
		"miner" : 3,
		"workerBee" : 3,
		"private" : 10, // scouts should chill out until an enemy enters the
		// room.
		"technician" : 5
	// Technicians should default to upgrading the
	// controller
	}

}

var lvl2room = function(room) {
	var roomConfig = room.memory.strategy;
	// Setup population goals
	roomConfig.latestModels = {
		"miner" : [ WORK, WORK, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
		"private" : [ TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE ],
		"pfc" : [ TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, RANGED_ATTACK,
				RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE ],
		"medic" : [ TOUGH, TOUGH, TOUGH, HEAL, HEAL, MOVE, MOVE ],
		"technician" : [ MOVE, MOVE, WORK, CARRY, CARRY ],
		"builder" : [ MOVE, MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK ]

	};

	// demographics effect build order
	roomConfig.goalDemographics = {
		// "miner" : 0.1,
		// "workerBee" : 0.2, // mins take care of these
		"private" : 0.2,
		"technician" : 0.2,
		"builder" : 0.3,
		"pfc" : 0.3,
		"medic" : 0.1
	};

	roomConfig.minDemographics = {
		"miner" : 3,
		"workerBee" : 3
	} // No mins, the goalDemo and max will
	// control build order this early in room

	roomConfig.maxDemographics = {
		"miner" : 3,
		"workerBee" : 3,
		"private" : 7,
		"technician" : 5
	}
}