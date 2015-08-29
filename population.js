// ---------------- 
//Main population knobs to tweak. Rest is mostly automatic
// This will be updated by strategy as controller increases
var design = {
	"miner" : [ WORK, WORK, MOVE, MOVE ],
	// Cost 300, Can get to source, sit there and mine. Probably limit to
	// three per source

	"workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
// Cost 300, can shuttle dropped energy to storage
};

var goalDemographics = { // unit types will be built in order listed
	"workerBee" : 0.4,
	"miner" : 0.4,
	"footSoldier" : 0.1
}

var minDemographics = { // Help bootstrap early game population
	'miner' : 3,
	'workerBee' : 3,
	'footSoldier' : 2
}

var maxDemographics = { // Ostensibly prevents choking
	'miner' : 3,
	'workerBee' : 3,
	'footSoldier' : 2
}
// ------------------

var cost = {
	"WORK" : 100,
	"CARRY" : 50,
	"TOUGH" : 10,
	"ATTACK" : 80,
	"MOVE" : 50,
	"HEAL" : 250,
	"RANGED_ATTACK" : 150
}

var getCost = function(design) {
	// design should be an array of body parts
	var cost = 0;
	for ( var part in design)
		cost += cost[design[part]];
	// TODO some test logic here
	return cost;
}

var isValidRole = function(role) {
	for ( var type in design) {
		if (design[type] == role) {
			return true;
		}
	}
	return false;
}

function nextPriority(room) {

	// If for some reason the room doesn't know what we have in the room
	if (typeof room.memory.currentPopulation === 'undefined') {
		room.memory.currentPopulation = census(room);
	}

	var currentPopulation = room.memory.currentPopulation;
	var totalPop = room.find(FIND_MY_CREEPS).length;

	// Edge case if there are no creeps yet, build the first in line
	if (!totalPop) {
		for ( var first in goalDemographics)
			return (first);
	}

	// Check minimum numbers
	for ( var i in minDemographics) {
		if (typeof currentPopulation[i] === 'undefined') {
			currentPopulation[i] = 0;
		}
		// See if we need more of them
		if (currentPopulation[i] < minDemographics[i]) {
			return (i);
		}
	}

	// if (room.memory.populationDebug) {
	// console
	// .log('Determining what unit to build next. Current population is '
	// + totalPop);
	// }

	// Let's see what we want the room to look like vs. what is here
	for ( var i in goalDemographics) {
		// If a unit we want isn't present yet, initialize the count for it
		if (typeof currentPopulation[i] === 'undefined') {
			currentPopulation[i] = 0;
		}

		// if (room.memory.populationDebug) {
		// console.log('I have ' + currentPopulation[i] + ' of type ' + i
		// + ' and that makes ' + currentPopulation[i] / totalPop
		// + ' of the population');
		// console.log('Goal percentage is ' + goalDemographics[i]);
		// }

		// See if we need more of them
		if (currentPopulation[i] / totalPop < goalDemographics[i]) {
			return (i);
		}
		// else {
		// if (room.memory.populationDebug) {
		// console.log('Don\'t need anymore ' + i);
		// }
		// }
	}

	return null;
}

// Show current room unit types and percent of goal
var printDemographics = function(room) {
	if (typeof room.memory.currentPopulation === 'undefined') {
		room.memory.currentPopulation = census(room);
	}

	var currentPopulation = room.memory.currentPopulation;
	var creepInRoom = room.find(FIND_MY_CREEPS);
	var totalPop = creepInRoom.length;

	for ( var c in currentPopulation) {
		var number = currentPopulation[c];
		if (c !== 'freeAgent') {
			console.log("There are " + number + " of type " + c
					+ " creeps, making up "
					+ (number / totalPop * 100).toFixed(2)
					+ "% of the population. The goal is " + goalDemographics[c]
					* 100 + "%");
		}
	}
}

var census = function(room) {
	var roles = {
		"freeAgent" : 0
	};
	var roomCreeps = room.find(FIND_MY_CREEPS);
	for ( var i in roomCreeps) {
		var youThere = roomCreeps[i];

		// Display the type of creep
		if (room.memory.showRole == 'yes') {
			youThere.say(youThere.memory.role);
		}

		if (typeof youThere.memory.role === 'undefined') { // Check for aliens
			youThere.memory.role = 'freeAgent';
		}

		if (typeof roles[youThere.memory.role] === 'undefined') {
			roles[youThere.memory.role] = 1
		} else {
			roles[youThere.memory.role]++;
		}
	}
	return roles; // Should be a list of roles and the number of each in the
	// room
}

var breed = function(room) {

	// // Short circuit a lot of processing if we've already done it but
	// couldn't
	// // finish
	// if ((room.memory.spawnWaiting != null)
	// && !(typeof room.memory.spawnWaiting === 'undefined')) {
	// if (!(create(room.memory.spawnWaiting, room))) {
	// room.memory.spawnWaiting = null;
	// }
	// }

	// var popLimit = room.memory.maxPop;
	create(nextPriority(room), room);
}

/**
 * Try to find a free spawner to create requested unit type
 */
function create(type, room) {

	var roomSpawns = room.find(FIND_MY_SPAWNS);

	for ( var i in roomSpawns) {
		var spawn = roomSpawns[i];
		var baby = spawn.canCreateCreep(design[type]);

		if (baby == OK) { // Create creep with a somewhat descriptive name

			var result = spawn.createCreep(design[type], room.name + "-" + type
					+ '.' + (Math.floor((Math.random() * 10000))), {
				"role" : type,
				"birthRoom" : room.name,
				"taskList" : []
			});

			if (typeof result === "string") {

				// Successful creation. Update census count. nextPriority
				// function makes sure there is a valid one, no need to check
				room.memory.currentPopulation[type]++;
				return OK;
			} else {
				// Check error log here.
				log("Possible name collision trying to create a creep! Unusual.");
			}
		} else {
			// Disposition
			switch (baby) {
			case ERR_NOT_ENOUGH_ENERGY:
				// Remember for next time, try again
				room.memory.spawnWaiting = type;
				break;
			case ERR_BUSY:
				// Remember for next time, try again
				room.memory.spawnWaiting = type;
				break;
			case ERR_INVALID_ARGS:
				dlog("Error birthing creep of type " + type + "!");
				break;
			}
		}
	}
	return -1;
}

function log(msg) {
	console.log('[Pop] ' + msg);
}

// / Scratch area
function buffDesign(design) {
	var buffedDesign = [];
	for ( var i in design) {
	}
}

function dlog(msg) {
	console.log('[DEBUG] ' + msg);
}

module.exports.design = design;
module.exports.minDemographics = minDemographics;
module.exports.maxDemographics = maxDemographics;
module.exports.goalDemographics = goalDemographics;
module.exports.census = census;
module.exports.breed = breed;
module.exports.printDemographics = printDemographics;