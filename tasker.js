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
		var creep = minions[dude];
		
		if (room.memory.planned
				&& creep.memory.taskList[creep.memory.taskList.length - 1] != 'builder') {
			// warm up the heat map
			var x = (creep.pos.x < 1) ? 1 : (creep.pos.x > 48) ? 48
					: creep.pos.x;
			var y = (creep.pos.y < 1) ? 1 : (creep.pos.y > 48) ? 48
					: creep.pos.y;
			room.memory.heatmap[x][y] += 10;
		}

		// minions[dude].say(minions[dude].memory.role);
		performTask(minions[dude]);
	}
}

// function retask(room, type, role) {
// // special cases stuff. Maybe find a beter way to do this
// if( role == 'builder')
// { var targets = room.find(FIND_MY_CONSTRUCTION_SITES);
// if (targets.length < 1) {return}}
//
// var roomCreeps = room.find(FIND_MY_CREEPS);
// // dlog('was told to retask all ' + type + ' to do ' + role)
// for ( var i in roomCreeps) {
// var youThere = roomCreeps[i];
// var yourJob = youThere.memory.role;
// var taskList = youThere.memory.taskList;
// if (util.def(yourJob) && (yourJob == type)
// && (taskList[taskList.length - 1] != role)) {
// // Check the latest task isn't already set to type
// dlog('preempting creep ' + youThere.name + ' task list to ' + role);
//
// youThere.memory.taskList.push(role)
// }
// }
// }
// module.exports.retask = retask

//
// Room.prototype.getSpawning = function() {
// var babbysForming = {};
// var spawns = this.find(FIND_MY_SPAWNS);
// for ( var n in spawns) {
// var spawn = spawns[n];
// if (util.def(spawn.spawning)) {
// babbysForming[spawn.spawning.name] = true;
// }
// }
//
// return babbysForming;
// }

var performTask = function(creep) {

	if (creep.spawning) {
		return;
	}

	// Two types of tasks: default role task, and special assigned tasks
	// role tasks are search and perform logic, assigned are specific targets
	// to prevent multiple units trying to work on the same thing

	var taskList = creep.memory.taskList;

	if (!util.def(taskList)) {
		// dlog('Undefined task list found: ' + creep.name);
		creep.memory.taskList = [];
	}

	if (taskList.length == 0) {
		// dlog('Empty task list found: ' + creep.name);
		taskList.push(somethingNeedDoing(creep));
	}
	// if ((taskList.length > 1) && !(Game.time % 10)) // Periodically refresh
	// // temporary tasksf
	// {
	// // dlog('refreshing the task list for ' + creep.name);
	// taskList.pop();
	// }
	var curJob = taskList[taskList.length - 1]
	var jobResult;
	// Global behavior definitions
	switch (curJob) {
	case 'miner':
		jobResult = harvest.mine(creep);
		break;
	case 'shuttle':
		jobResult = harvest.shuttle(creep);
		break;
	case 'gatherer':
		jobResult = harvest.gatherer(creep);
				break;
	case 'military':
		jobResult = military.duty(creep);
		break;
	case 'technician':
		jobResult =  build.upgradeRC(creep);
		break;
	case 'builder':
		jobResult = build.builder(creep);
		break;
	case 'damageControl':
		jobResult = 	build.repair(creep);
		break;
	default:
		dlog('Unhandled creep task! (' + taskList[taskList.length - 1] + ')');
	}
	
//	dlog(creep.name + ' did ' + curJob + ' and his aim was ' + jobResult);
	if (!jobResult) {
		creep.memory.taskList.pop();
	}
}
module.exports.performTask = performTask;

var getDefaultTask = function(creep) { // What to do if the creep has
	// nothing to do

	var role = Memory.creeps[creep.name].role; // Access memory like this in
	// case creep is still spawning.

	if (!util.def(role)) {
		role = 'worker'
	}
	dlog('found a ' + creep.memory.role + ' needing a job')
	
	

	// dlog('assigning default task');
	switch (role) {
	case 'worker':
		return 'gatherer';
	case 'miner':
		return 'miner'
	case 'soldier':
	case 'medic':
		// case 'scout':
		// case 'pfc':
		// case 'footSoldier':
		// case 'cavalry':
		// case 'enforcer':
		return 'military';
	default:
		console.log('unmatched unit found!');
		return 'gatherer';
	}
}

function somethingNeedDoing(creep) {

	
	
	// Some tasks are role bound by bodyparts
	if (creep.memory.role == 'miner') {return 'miner'};
	if (creep.memory.role == 'soldier') {return 'soldier	'};
	
	switch (creep.memory.role) {
	case 'worker': 
		var result = Math.floor((Math.random() * 10));
		if (result < 3) {
			return 'gatherer'
		} else if (result < 6) {
			return 'technician'
		} else {
			return 'builder'
		}
	}

	// General worker
	// Determine the most pressing need and assign

	var nrg = creep.room.find(FIND_DROPPED_RESOURCES, {
		filter : {
			resourceType : RESOURCE_ENERGY
		}
	});
	var loot = 0;
	for ( var glob in nrg) {
		loot += nrg[glob].amount;
	}
	var builds = creep.room.find(FIND_MY_CONSTRUCTION_SITES).length;

	var needsOfTheFew = {
		'worker' : builds * 5 + loot + popCon.minerWeight
				* (Object.keys(room.memory.shafts).length - have.miner),
		'miner' : ((Object.keys(room.memory.shafts).length - have.miner) * have.worker)
				* popCon.minerWeight * vetoMiner,
		'soldier' : 15 + ((6 - room.memory.strategy.defcon) * 20),
		'medic' : ((have.soldier - have.medic) * popCon.medicWeight)
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

//
// function addTask(creep, task) {
// dlog('preempting creep ' + creep.name + ' task list to ' + task);
//
// if (task == 'construction') {
// creep.memory.taskList.push('')
// }
// }
function dlog(msg) {
	util.dlog('TASKER', msg);
}
