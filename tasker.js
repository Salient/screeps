/**
 * 
 */

var util = require('common');

var harvest = require('harvester');
var build = require('builder');
var military = require('tactics');

var debug = true; // Debug code

module.exports.taskMinions = function(room) {
	var minions = room.find(FIND_MY_CREEPS);
	for ( var dude in minions) {
		performTask(minions[dude]);
		// upgrade(minions[dude]); // TEMP CODE
	}
}

function dlog(msg) {
	util.dlog('TASKER', msg);
}

var performTask = function(creep) {
	var taskList = creep.memory.taskList;

	// Two types of tasks: default role task, and special assigned tasks
	// role tasks are search and perform logic, assigned are specific targets
	// to prevent multiple units trying to work on the same thing

	if (typeof taskList === 'undefined') {
		dlog('Undefined task list found: ' + creep.name);
		taskList = [];
	}

	if (taskList[0] === 'undefined' || (taskList[0] == null)) {
		dlog('Empty task list found: ' + creep.name);
		taskList[0] = getDefaultTask(creep);
	}
	// Global behavior definitions
	switch (taskList[taskList.length - 1]) {
	case 'miner':
		harvest.miner(creep);
		break;
	case 'shuttle':
		harvest.shuttle(creep);
		break;
	case 'harvestSortingHat': // Shuttle creep have the parts to be useful
		harvest.sortingHat(creep);
		break;
	case 'gatherer':
		harvest.gatherer(creep);
		break;
	case 'military':
		military.duty(creep);
		break;
	case 'technician':
		build.upgradeController(creep);
		break;
	}
}

// // Get
// module.exports.houseKeeping = function() {
// var keys = Object.keys(Game.creeps); // Get array of my creeps
//
// // List periodic maintenance functions here
// var honeyDoList = [ harvest.pickUpJunk() ];
//
// for ( var task in honeyDoList) {
// var unluckyOne = keys[Math.floor(keys.length * Math.random())]; // Select
// // a
// // random
// // creep
// Game.creeps[unluckyOne].memory.taskQueue.unshift(honeyDoList[task]);
// }
// }

var getDefaultTask = function(creep) { // What to do if the creep has
	// nothing to do
	var role = creep.memory.role;
	dlog('assigning default task');
	switch (role) {
	case 'workerBee':
		return 'harvestSortingHat';
	case 'gatherer':
	case 'miner':
	case 'technician':
	case 'construction':
		return role;
	case 'scout':
	case 'footSoldier':
	case 'cavalry':
	case 'enforcer':
		return 'military';
	default:
		console.log('unmatched unit found!');
		return 'freeAgent';
	}
}
