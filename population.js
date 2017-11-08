var util = require('common');

// // ----------------
// // Main population knobs to tweak. Rest is mostly automatic
// // This will be updated by strategy as controller increases
// var design = {
// 'babyHarvester' : [ WORK, WORK, CARRY, MOVE ],
// "miner" : [ WORK, WORK, MOVE, MOVE ],
// // Cost 300, Can get to source, sit there and mine. Probably limit to
// // three per source
//
// "workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ],
// // Cost 300, can shuttle dropped energy to storage
// };
//
// var goalDemographics = { // unit types will be built in order listed
// "workerBee" : 0.4,
// "miner" : 0.4,
// "footSoldier" : 0.1
// }
//
// var minDemographics = { // Help bootstrap early game population
// 'miner' : 3,
// 'workerBee' : 3,
// 'footSoldier' : 2
// }
//
// var maxDemographics = { // Ostensibly prevents choking
// 'miner' : 3,
// 'workerBee' : 3,
// 'footSoldier' : 2
// }
// // ------------------

Room.prototype.popCount = function() {
	return this.find(FIND_MY_CREEPS).length
}

var costLookup = {
	"work" : 100,
	"carry" : 50,
	"tough" : 10,
	"attack" : 80,
	"move" : 50,
	"heal" : 250,
	"ranged_attack" : 150
}

var getCost = function(design, room) {
	var makeup = room.memory.strategy.latestModels[design];
	if (util.def(makeup)) {
		var cost = 0;
		for ( var part in makeup) {
			cost += costLookup[makeup[part]];
		}
		return cost;
	} else {
		return null;
	}
}

var isValidRole = function(room, role) {

	// dlog('testing if ' + role + ' is valid for room ' + room);

	if (!util.def(room.memory)) {
		dlog('dafuq?')
	}

	if (!util.def(room.memory.strategy)) {// hrm....
		roomstrat.strategery(room);

	}

	if (!(util.def(room.memory.strategy.latestModels))) {
		return false;
	}
	var design = room.memory.strategy.latestModels;

	for ( var type in design) {
		// dlog(' is ' + type + ' what im looking for?');
		if (type == role) {
			// dlog('herpaderp derp');
			return true;
		}
	}
	return false;
}

function nextPriority(room) {
	// Pull up memory
	var strategy = room.memory.strategy;

	// These basic five should be set/updated by strategy periodically
	// Else, the previous value holds

	var design = strategy.latestModels;
	var goalDemographics = strategy.goalDemographics;
	var maxDemographics = strategy.maxDemographics;
	var minDemographics = strategy.minDemographics;

	// Not set by strategy, set in main on timer

	// If for some reason the room doesn't know what we have in the room
	if (!util.def(strategy.currentPopulation)) {
		strategy.currentPopulation = census(room);
	}

	var currentPopulation = strategy.currentPopulation;

	var totalPop = room.find(FIND_MY_CREEPS).length;

	// Edge case if there are no creeps yet, build the first in line
	// else we might divide by the unholy zero
	if (!totalPop) {
		if (!util.def(design)) {
			dlog('wtf2');
			return null;
		}
	}

	// Check minimum numbers
	for ( var i in minDemographics) {
		if (!util.def(currentPopulation[i])) {
			currentPopulation[i] = 0;
		}
		// dlog("checking minimums for " + i);
		// See if we need more of them
		if (currentPopulation[i] < minDemographics[i]) {
			// dlog('Must build a minimum of ' + minDemographics[i] + ' ' + i);
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
		if (!util.def(currentPopulation[i])) {
			currentPopulation[i] = 0;
		}

		// See if we need more of them
		// dlog('checking if we need more ' + i);
		if (!isValidRole(room, i)) {
			dlog(i + ' type is no longer in creep definitions.');
			continue;
		}
		if ((currentPopulation[i] / totalPop) < goalDemographics[i]) {
			// dlog('We have less ' + i + ' than the goal percentage');
			// Check Maximums
			if (currentPopulation[i] >= maxDemographics[i]) {
				// dlog("But we have met the maximum number of " + i);
				continue;
			} else {
				// dlog('yep, creating a ' + i);
				return (i);
			}
		} else {

			// dlog('we have enough ' + i);
			continue;
		}
		// else {
		// if (room.memory.populationDebug) {
		// console.log('Don\'t need anymore ' + i);
		// }
		// }
	}

	// return null;
}

// Show current room unit types and percent of goal
var printDemographics = function(room) {
	var goalDemographics = room.memory.strategy.goalDemographics;
	var currentPopulation = room.memory.strategy.currentPopulation;
	var minDemographics = room.memory.strategy.minDemographics;

	if (typeof currentPopulation === 'undefined') {
		room.memory.strategy.currentPopulation = census(room);
	}

	var totalPop = room.find(FIND_MY_CREEPS).length;

	for ( var c in currentPopulation) {
		var number = currentPopulation[c];
		if (c !== 'freeAgent') {
			console.log("There are " + number + " " + c + " creeps, making up "
					+ (number / totalPop * 100).toFixed(2)
					+ "% of the population. The goal is " + goalDemographics[c]
					* 100 + "% (with minimum of " + minDemographics[c] + ').');
		}
	}
}

var census = function(room) {
	var roles = {};
	var roomCreeps = room.find(FIND_MY_CREEPS);
	for ( var i in roomCreeps) {
		var youThere = roomCreeps[i];
		var yourJob = Memory.creeps[youThere.name].role;
		// Display the type of creep
		if (room.memory.showRole == 'yes') {
			youThere.say(yourJob);
		}
		// I think this code screws up during spawn. I don't think it's
		// necessary anyway
		// if (typeof youThere.memory.role === 'undefined') { // Check for
		// aliens
		// youThere.memory.role = 'freeAgent';
		// }

		if (typeof roles[yourJob] === 'undefined') {
			roles[yourJob] = 1;
		} else {
			roles[yourJob]++;
		}
	}
	room.memory.strategy.currentPopulation = roles;
	return roles; // Should be a list of roles and the number of each in the
	// room
}

var breed = function(room) {

	// // Short circuit a lot of processing if we've already done it but
	// couldn't
	// // finish
	var bowchickabowchicka = null;

	if (!util.def(room.memory.spawnWaiting)) {
		room.memory.spawnWaiting = null;
	}

	// if (room.memory.spawnWaiting != null) {
	// // bowchickabowchicka = room.memory.spawnWaiting;
	// ; // not sure if having it waiting does much
	// } else {
	bowchickabowchicka = nextPriority(room);
	// }

	if (bowchickabowchicka == null) {
		dlog('wut? no pootang?');
		return;
		// var popLimit = room.memory.maxPop;
	}

	// if (isValidRole(room, bowchickabowchicka)) {
	if (isValidRole(room, bowchickabowchicka)) {
		var result = create(bowchickabowchicka, room);
		if (result < 0) {
			dlog("Error creating creep: " + util.getError(result));
			// }
			// } else {
			// dlog('invalid design'); // tried to create invalid
			// creep...probably
			// // null?
		}
	} else {
		dlog('Entry ' + bowchickabowchicka
				+ ' is in min demographics, but not in latest models')
	}
}

/**
 * Try to find a free spawner to create requested unit type
 */
function create(type, room) {

	var strategy = room.memory.strategy;

	var design = strategy.latestModels;
	var currentPopulation = strategy.currentPopulation;

	var roomSpawns = room.find(FIND_MY_SPAWNS);
	for ( var i in roomSpawns) {
		var spawn = roomSpawns[i];
		var baby = spawn.canCreateCreep(design[type]);
		if (baby == OK) { // Create creep with a somewhat descriptive name

			var result = spawn.createCreep(design[type], room.name + "*" + type
					+ '.' + (Math.floor((Math.random() * 10000))), {
				"role" : type,
				"birthRoom" : room.name,
				"taskList" : []
			});

			if (typeof result === "string") {
				dlog('Spawning ' + type + ' creep...')
				// Successful creation. Update census count. nextPriority
				// function makes sure there is a valid one, no need to check
				currentPopulation[type]++;
				room.memory.spawnWaiting = null;
				return OK;
			} else {
				// Check error log here.
				dlog("Possible name collision trying to create a creep! Unusual.");
			}
		} else {
			// Disposition
			switch (baby) {
			case ERR_NOT_ENOUGH_ENERGY:

				// check it's *possible* to have enough energy
				var cashMoney = getCost(type, room);
				var cap = room.energyCapacityAvailable;
				if (cap < cashMoney) {
			
				  dlog('Stragey error! Not enough energy capacity to build creep')
					dlog('Removing the first body part and trying again...')
					var tempType = design[type];
					tempType = tempType.slice(1, tempType.length - 1)
					var result = spawn.createCreep(tempType, room.name
							+ "-weakened-" + type + '.'
							+ (Math.floor((Math.random() * 10000))), {
						"role" : type,
						"birthRoom" : room.name,
						"taskList" : []
					});

				}
				// dlog('WE REQUIRE MORE VESPENE GAS')
				// dlog('cant build type ' + type)
				// // Remember for next time, try again
				room.memory.spawnWaiting = type;
				break;
			case ERR_BUSY:
				// dlog('your mother is a busy woman')
				// Remember for next time, try again
				room.memory.spawnWaiting = type;
				break;
			case ERR_INVALID_ARGS:
				dlog("Error birthing creep of type " + type + "!");
				break;
			default:
				return baby;
			}
		}
	}
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
	util.dlog('POPULATION', msg);
}
module.exports.census = census;
module.exports.breed = breed;
module.exports.printDemographics = printDemographics;
