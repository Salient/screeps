var design = {
	"workerBee" : [ WORK, CARRY, CARRY, MOVE, MOVE ],
	"engineer" : [ WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY ],
	"construction" : [ WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY ],
	"footSoldier" : [ TOUGH, ATTACK, MOVE, MOVE ]
};

var popLimit = 1;
var techLimit = 1;

var goalDemographics = { // unit types will be built in order listed
	"workerBee" : 0.4,
	"construction" : 0.25,
	"engineer" : 0.25,
	"footSoldier" : 0.1
}

function nextPriority(room) {
	var type;
	if (typeof room.memory.currentPopulation === 'undefined') {
		room.memory.currentPopulation = census(room);
	}
	var currentPopulation = room.memory.currentPopulation;
	var totalPop = room.find(FIND_MY_CREEPS).length;

	// Edge case if there are no creeps yet
	if (!totalPop) {
		for (var first in goalDemographics)
			create(first);
			return;
	}
	if (room.memory.populationDebug)
		console
				.log('Determining what unit to build next. Current population is '
						+ totalPop);

	for ( var i in goalDemographics) {
		if (typeof currentPopulation[i] === 'undefined') {
			currentPopulation[i] = 0;
		}
		if (room.memory.populationDebug) {
			console.log('I have ' + currentPopulation[i] + ' of type ' + i
					+ ' and that makes ' + currentPopulation[i] / totalPop
					+ ' of the population');
			console.log('Goal percentage is ' + goalDemographics[i]);
		}
		if (currentPopulation[i] / totalPop < goalDemographics[i]) {
			create(i);
			// TODO: create error handling.
			if (room.memory.populationDebug)
				console.log("Creating unit type " + i);
			// update census? or just pop++ ?
			return;
		} else {
			if (room.memory.populationDebug)
				console.log('Don\'t need anymore ' + i);
		}
	}

	return type;
}

var census = function(room) {
	var roles = {
		"freeAgent" : 0
	};
	var roomCreeps = room.find(FIND_MY_CREEPS);
	for ( var i in roomCreeps) {
		var youThere = roomCreeps[i];

		// Display the type of creep
		if (room.memory.showRole == 'yes')
			youThere.say(youThere.memory.role);

		if (typeof youThere.memory.role === 'undefined') { // Check for aliens
			youThere.memory.role = 'freeAgent';
		}

		if (typeof roles[youThere.memory.role] === 'undefined')
			roles[youThere.memory.role] = 1
		else
			roles[youThere.memory.role]++;
	}
	return roles; // Should be a list of roles and the number of each in the
	// room
}

module.exports.breed = function(room) {
	if (typeof room.memory.currentPopulation === 'undefined')
		room.memory.currentPopulation = census(room);

	nextPriority(room);

	var currentPop = room.memory.currentPopulation;
}

/**
 * Try to find a free spawner to create requested unit type
 */
function create(type) {
	// Convert an idle
	if (Memory.idle != null && Memory.idle.length != 0) {
		var creep = Memory.idle.pop();
		creep.memory.role = type;
		log("Putting " + creep.name + " to work as a " + type);
		return creep.name;
	}

	for ( var i in Game.spawns) {
		var spawn = Game.spawns[i];
		if (spawn.canCreateCreep(design[type]) == OK) {
			log("Creating a " + type);
			return spawn.createCreep(design[type], null, {
				role : type
			});
		}
	}
	return -4; // 'busy'
}

function cull(type) {
}

function updateRealPop() {
	var role, name;
	clearRealPop();

	for (name in Game.creeps) {
		var creep = Game.creeps[name];
		if (!creep.my) {
			continue;
		}

		if ("role" in creep.memory) {
			role = creep.memory['role'];
			realPop[role]++;
		} else {
			if (Memory.idle == null) {
				log('Initializing idle list');
				Memory.idle = [];
			}
			Memory.idle.push(creep);
			log('Warning: ' + creep.name + ' has no role.');
		}
	}
}

function genDesiredPop(room) {
}

function clearRealPop() {
	Memory.realPop = emptyPop;
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

module.exports.census = census;
