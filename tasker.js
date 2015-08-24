/**
 * 
 */

var harvest = require('harvester');
var build = require('builder');
var upgrade = require('upgrader');
var patrol = require('guard');

module.exports.taskMinions = function(room) {
	var minions = room.find(FIND_MY_CREEPS);
	for ( var dude in minions) {
		performTask(minions[dude]);
		// upgrade(minions[dude]); // TEMP CODE
	}
}

var performTask = function(creep) {
	if (typeof creep.memory.taskQueue === 'undefined') {
		creep.memory.taskQueue = [];
	}

	var tasks = creep.memory.taskQueue;

	if (!tasks[0]) {
		tasks[0] = assignDefaultTask(creep); // Add default task to
		// queue
	}

	// debug
	for ( var frack in tasks)
		console.log('task index ' + frack + ' is ' + tasks[frack]
				+ ', with length ' + tasks.length);

	console.log(creep.name + ' is performing task ' + tasks[0].taskName);
	tasks[0].job; // perform first on todo list
	console.log(creep.name + ' is done?');
}

// Get
module.exports.houseKeeping = function() {
	var keys = Object.keys(Game.creeps); // Get array of my creeps

	// List periodic maintenance functions here
	var honeyDoList = [ harvest.pickUpJunk() ];

	for ( var task in honeyDoList) {
		var unluckyOne = keys[Math.floor(keys.length * Math.random())]; // Select
		// a
		// random
		// creep
		Game.creeps[unluckyOne].memory.taskQueue.unshift(honeyDoList[task]);
	}
}

var assignDefaultTask = function(creep) { // What to do if the creep has
	// nothing to do
	var todo = function(creep) {
	};

	if (creep.memory.role == 'workerBee') {
		console.log('Assigning default role to workerbee ' + creep.name);
		todo.taskName = 'harverst';
		todo.job = harvest(creep);
		return todo;
	}

	if (creep.memory.role == 'engineer') {

		console.log('Assigning default role to engineer ' + creep.name);
		todo.taskName = 'Upgrade';
		todo.job = upgrade(creep);
		return todo;
	}
	if (creep.memory.role == 'footSoldier') {

		console.log('Assigning default role to soldier ' + creep.name);
		todo.taskName = 'patrol';
		todo.job = patrol(creep);
		return todo;
	}
	if (creep.memory.role == 'construction') {

		console.log('Assigning default role to conbot ' + creep.name);
		todo.taskName = 'build';
		todo.job = build(creep);
		return todo;
	}

	console.log('unmatched unit found!');

}
