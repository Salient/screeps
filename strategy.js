/**
 * 
 */

var population = require('population');
var util = require('common');

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

	if (typeof room.memory.strategy === 'undefined') {
		room.memory.strategy = {};
	}

	var roomConfig = room.memory.strategy;

	if (typeof roomConfig.curlvl === 'undefined') {
		roomConfig.curlvl = 0;
	}
	if (typeof room.controller === 'undefined') {
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
	if (room.popCount() >= 6) {
		// Enough bootstrapping, proceed to Phase II of the Plan
		return lvl1room(room);
	}
	// Set basic population control parameters
	var roomConfig = room.memory.strategy;

	roomConfig.latestModels = {
		'gatherer' : [ WORK, WORK, CARRY, MOVE ],
		"miner" : [ WORK, WORK, MOVE ],
		"scout" : [ TOUGH, ATTACK, MOVE, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ]
	};

	// demographics control build order
	// This will build in sequence (assuming nobody dies)
	// miner, worker, scout, miner, worker, tech, miner,worker,scout,tech?
	roomConfig.goalDemographics = {
		"gatherer" : 0.2,
		"scout" : 0.2,
		"miner" : 0.4,
		"workerBee" : 0.4,
		"technician" : 0.2
	}
	roomConfig.minDemographics = {
		"gatherer" : 1
	// Build two of these first thing
	}
	roomConfig.maxDemographics = {
		"gatherer" : 3,
		"scout" : 2,
		"workerBee" : 3,
		"miner" : 3,
	}
}

var lvl1room = function(room) {
	var roomConfig = room.memory.strategy;
	// Just checking if we can get off the ground properly
	if (room.popCount() <= 3) {
		return bootstrap(room);
	}
	dlog('lvl1 proper, pop counted ' + room.popCount());
	// Setup population goals
	roomConfig.latestModels = {
		"miner" : [ WORK, WORK, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
		"scout" : [ TOUGH, ATTACK, MOVE, MOVE ],
		"technician" : [ MOVE, MOVE, WORK, CARRY, CARRY ]
	};

	// demographics control build order
	// This will build in sequence (assuming nobody dies)
	// miner, worker, scout, miner, worker, tech, miner,worker,scout,tech?
	roomConfig.goalDemographics = {
		"miner" : 0.4,
		"workerBee" : 0.4,
		"scout" : 0.2,
		"technician" : 0.2
	};

	roomConfig.minDemographics = {} // No mins, the goalDemo and max will
	// control build order this early in room
	roomConfig.maxDemographics = {
		"gatherer" : 5,
		"miner" : 3,
		"workerBee" : 3,
		"scout" : 3, // scouts should chill out until an enemy enters the
		// room.
		"technician" : 5
	// Technicians should default to upgrading the
	// controller
	}

}

var lvl2room = function(room) {
	// Setup population goals
	population.setDesign({
		"miner" : [ WORK, WORK, MOVE ],
		"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
		"scout" : [ TOUGH, ATTACK, MOVE, MOVE ],
		"technician" : [ MOVE, MOVE, WORK, CARRY, CARRY ],
		"builder" : [ MOVE, MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK ]
	});

	// demographics control build order
	// This will build in sequence (assuming nobody dies)
	// miner, worker, scout, miner, worker, tech, miner,worker,scout,tech?
	population.goalDemographics = {
		"miner" : 0.4,
		"workerBee" : 0.4,
		"scout" : 0.2,
		"technician" : 0.2
	}
	population.minDemographics = {} // No mins, the goalDemo and max will
	// control build order this early in room
	population.maxDemographics = {
		"miner" : 3,
		"workerBee" : 3,
		"scout" : 3,
		"technician" : 5
	}
}