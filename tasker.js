/**
 * 
 */

var debug = true; // Debug code

var harvest = require('harvester');
var build = require('builder');
var upgrade = require('upgrader');
var patrol = require('guard');
// var population = require('population');

module.exports.taskMinions = function(room) {
	var minions = room.find(FIND_MY_CREEPS);
	for ( var dude in minions) {
		performTask(minions[dude]);
		// upgrade(minions[dude]); // TEMP CODE
	}
}

var taskObject = function(name, jobPtr, length) {
	this.taskName = name;
	this.job = function job() {
		jobPtr
	};
	this.startTime = Game.time;
	this.taskDuration = length;
}

var dlog = function(msg) {
	console.log('[DEBUG: TASKER] ' + msg);
}

var performTask = function(creep) {
	var tasks = creep.memory.taskQueue;

	// Not sure when this would happen...
	if (typeof tasks === 'undefined') {
		tasks = [ assignDefaultTask(creep) ];
		// Assign default role task for next 5 minutes
		console.log('Error, creep found without a task list');
	}

	for ( var gig in tasks) {
		if (Game.time - tasks[gig].startTime > tasks[gig].taskDuration) {
			delete tasks[gig];
		}
	}

	tasks.sort(); // pull out any undefined tasks

	if (debug) {
		dlog('Checking if taskQueue empty');
	}

	// return;
	if ((tasks[0] == null) || typeof tasks[0] === 'undefined') {
		console.log('assigning defult');
		tasks.push(assignDefaultTask(creep));
		// return;
		// tasks.push('1');
	}

	if (tasks[tasks.length - 1]) {
		return;
	}
	// debug
	for ( var frack in tasks)
		console.log('task index ' + frack + ' is ' + tasks[frack]
				+ ', with length ' + tasks.length);

	console.log(creep.name + ' is performing task ' + tasks[0].taskName);

	creep.say(tasks[0].taskName);
	// var jobResult = tasks[0].job(creep); // perform first on todo list
	// switch (jobResult) {
	// case: OK
	// // task done?
	// break;
	// case: ERR_NOT_ENOUGH_ENERGY
	// break;
	// // We require more vespene gas. Spend some amount of time harvesting
	// // instead?
	// }
	console.log(creep.name + ' is done?');
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

var assignDefaultTask = function(creep) { // What to do if the creep has
	// nothing to do
	var role = creep.memory.role;
	dlog("huumm");
	// return;
	if (role == 'miner') {
		if (debug) {
			dlog('Assigning default role to miner ' + creep.name);
		}
		return new taskObject('Mining energy', harvest.miner
		// harvest.miner
		, 300);
	}

	if (role == 'workerBee') {
		if (debug) {
			dlog('Assigning default role to workerbee ' + creep.name);
		}
		// return null;
		return new taskObject('Picking up energy', harvest.shuttle, 300);
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
	// return new taskObject('I have no job!!!', creep.say('who am i'), 30);
}
