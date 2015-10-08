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
		// minions[dude].say(minions[dude].memory.role);
		performTask(minions[dude]);
		// upgrade(minions[dude]); // TEMP CODE
	}
}

function dlog(msg) {
	util.dlog('TASKER', msg);
}

Room.prototype.getSpawning = function() {
	var babbysForming = {};
	var spawns = this.find(FIND_MY_SPAWNS);
	for ( var n in spawns) {
		var spawn = spawns[n];
		if (util.def(spawn.spawning)) {
			babbysForming[spawn.spawning.name] = true;
		}
	}

	return babbysForming;
}

// Creep.prototype.isSpawning = function() {
// var howBabbysFormed = this.room.getSpawning();
// if (howBabbysFormed.length) {
// for ( var x in howBabbysFormed) {
// if (howBabbysFormed == creep) {
// return true;
// } else {
// return false;
// }
// }
// }
//
// }

var performTask = function(creep) {

	if (creep.spawning) {
		return;
	}

	// Two types of tasks: default role task, and special assigned tasks
	// role tasks are search and perform logic, assigned are specific targets
	// to prevent multiple units trying to work on the same thing

	var taskList = Memory.creeps[creep.name].taskList;

	if (!util.def(taskList)) {
		dlog('Undefined task list found: ' + creep.name);
		Memory.creeps[creep.name].taskList = [];
	}

	if ((typeof taskList[0] === 'undefined') || (taskList[0] == null)) {
		dlog('Empty task list found: ' + creep.name);
		taskList[0] = getDefaultTask(creep);
	}
	if ((taskList.length > 1) && !(Game.time % 10)) // Periodically refresh
	// temporary tasksf
	{
		// dlog('refreshing the task list for ' + creep.name);
		taskList.pop();
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
	case 'janitor':
		build(creep);
		harvest.scrounge(creep, 'sweep') // if there is energy lying around,
											// we should
		// stop building and go grab it
		break;
	case 'military':
		military.duty(creep);
		break;
	case 'technician':
		build.upgradeController(creep);
		break;
	case 'builder':
		build(creep);
		break;
	case 'freeAgent':
		harvest.sortingHat(creep);
	default:
		dlog('Unhandled creep task! (' + taskList[taskList.length - 1] + ')');
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
	var role = Memory.creeps[creep.name].role; // Access memory like this in
	// case creep is still spawning.

	if (typeof role === 'undefined') {
		dlog('aaaahhh motherland!');
		creep.suicide(); // debug code
	}

	dlog('assigning default task');
	switch (role) {
	case 'freeAgent':
	case 'workerBee':
	case 'gatherer':
		return 'harvestSortingHat';
	case 'miner':
	case 'technician':
	case 'construction':
		return role;
	case 'private':
	case 'scout':
	case 'pfc':
	case 'footSoldier':
	case 'cavalry':
	case 'enforcer':
		return 'military';
	default:
		console.log('unmatched unit found!');
		return 'harvestSortingHat';
	}
}
