/**
 * 
 */

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
		dlog('duci ' + creep.name);
		taskList = "weeeell?";
	}

	if (taskList[0] === 'undefined' || (taskList[0] == null)) {
		dlog('dkdkdk ' + creep.name);
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
	case 'harvestSortingHat':
		harvest.sortingHat(creep);
	}

	dlog('tik');
	// var dlogId = dlog.id;
	// var jobId = bleep.id;
	// creep.memory.functionId = dlogId;

	// dlog("thick");
	//
	// // bleep.test();
	// for ( var i in creep.room) {
	// dlog("property: " + i + ' is ' + creep[i]);
	// }
	// bleep.job("victory");
	// var myArray = [];
	// myArray.push(bleep);
	// dlog(myArray);
	// dlog(myArray[0]);
	// myArray[0].job('awww jusss');
	// // creep.memory.tddd = myArray;
	// creep.memory.myArray = myArray;
	// // dlog('keep');
	// creep.memory.TEST = [ new taskObject('three', 'four', 300) ];

	// var tasks = creep.memory.taskQueue;
	//
	// // Not sure when this would happen...
	// if (typeof tasks === 'undefined' || (tasks == null)) {
	// // tasks = [ assignDefaultTask(creep) ];
	// // Assign default role task for next 5 minutes
	// console.log('Error, creep found without a task list');
	// creep.memory.taskQueue = [ 'one', 'threeder' ];
	// }
	//
	// for ( var gig in tasks) {
	// if ((tasks[gig] == null)
	// || (Game.time - tasks[gig].startTime > tasks[gig].taskDuration)) {
	// delete tasks[gig];
	// }
	// }
	// tasks.sort(); // pull out any undefined tasks
	//
	// // if (debug) {
	// // dlog('Checking if taskQueue empty');
	// // }
	//
	// // return;
	// if ((typeof tasks[0] === 'undefined') || (tasks[0] == null)) {
	// console.log('assigning defult');
	//
	// tasks[0] = 'friday';
	// tasks[1] = {
	// 'one' : 1,
	// 'two' : 2
	// };
	// dlog("well thats a first");
	//
	// // function test() {
	// // }
	// // tasks[3] = test;
	//
	// // (assignDefaultTask(creep));
	// // return;
	// // tasks.push('1');
	// }

	// if (tasks[tasks.length - 1]) {
	// return;
	// }
	// debug
	// for ( var frack in tasks)
	// console.log('task index ' + frack + ' is ' + tasks[frack]
	// + ', with length ' + tasks.length);
	//
	// tasks[3]();

	// console.log(creep. name + ' is performing task ' + tasks[0].taskName);

	// creep.say(tasks[0].taskName);
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
	// console.log(creep.name + ' is done son?');
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
