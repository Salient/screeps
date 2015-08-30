/**
 * 
 */

var util = require('common');

var debug = true; // Debug code

var harvest = require('harvester');
var build = require('builder');

// var upgrade = require('upgrader');
var patrol = require('guard');
// var population = require('population');

module.exports.taskMinions = function(room) {
	var minions = room.find(FIND_MY_CREEPS);
	for ( var dude in minions) {
		performTask(minions[dude]);
		// upgrade(minions[dude]); // TEMP CODE
	}
}
var dlog = function(msg) {
	console.log('[DEBUG: TASKER] ' + msg);
}

function dumpObject(obj) {
	for ( var x in obj) {
		dlog('parameter: ' + x + ' is ' + obj[x]);
	}
}

var performTask = function(creep) {

	// dlog('performing task for ' + creep.name);
	// // dumpObject(creep);
	// dlog('creep mems');
	// dumpObject(creep.memory);

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
	case 'gatherer':
		harvest.gatherer(creep);
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

	if (role == 'miner') {
		return role;
	}

	if (role == 'workerBee') {
		return 'harvestSortingHat';
	}

	if (role == 'gatherer') {
		return 'gatherer';
	}

	if (creep.memory.role == 'construction') {
		if (debug) {
			dlog('Assigning default role to engineer ' + creep.name);
		}

		return new taskObject('Building/Upgrading', build.construction, 300);
	}

	if (creep.memory.role == 'footSoldier') {
		if (debug) {
			dlog('Assigning default role to soldier ' + creep.name);
		}
		return new taskObject('Patrolling Base', patrol, 300);
	}

	if (creep.memory.role == 'engineer') {
		if (debug) {
			dlog('Assigning default role to conbot ' + creep.name);
		}

		return new taskObject('Laying some pipe', builder.engineer, 300);
	}

	console.log('unmatched unit found!');
	return 'freeAgent';
	// return new taskObject('I have no job!!!', creep.say('who am i'), 30);
}

// module.exports.taskMinions = performTask;
