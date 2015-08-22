
var design = {
    "harvester": [WORK, CARRY, CARRY, MOVE, MOVE],
    "upgrade":   [WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY],
    "builder":   [WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY],
    "guard": [TOUGH, ATTACK, MOVE, MOVE]
};

var popLimit=1;
var techLimit=1;

var goalDemographics = {
		"workerBee": 0.4,
		"footSoldier": 0.1,
		"engineer": 0.25,
		"construction": 0.25
}

function nextPriority() {
	var type;
	for (var i in currentDemographics){
		
	}
	
	
	return type;
}

	
function census(room) {
	var roles = { 
			"freeAgent": 0
	};
	var roomCreeps = room.find(FIND_MY_CREEPS);
	for (var i in roomCreeps) {
		var youThere = roomCreeps[i];
		
		if (typeof youThere.memory.role === 'undefined') { // Check for aliens
			youThere.memory.role = 'freeAgent';
		}
		
		if (typeof roles[youThere.memory.role] === 'undefined')
			roles[youThere.memory.role] = 1
		else
			roles[youThere.memory.role]++;
	}
	return roles; //Should be a list of roles and the number of each in the room
}

var importance = ["guard", "harvester", "builder", "upgrade"];
var realPop = Memory.realPop;

module.exports.breed = function (room) {
	if (typeof room.memory.currentPopulation === 'undefined')
		
    var currentPop = room.memory.currentPopulation;
    create('harvester');
}

/**
 * Try to find a free spawner to create requested unit type
 */
function create(type) {
    //Convert an idle
    if(Memory.idle != null && Memory.idle.length != 0) {
        var creep = Memory.idle.pop();
        creep.memory.role = type;
        log("Putting " + creep.name + " to work as a " + type);
        return creep.name;
    }

    for (var i in Game.spawns) {
        var spawn = Game.spawns[i];
        if (spawn.canCreateCreep(design[type]) == OK) {
            log("Creating a " + type);
            return spawn.createCreep(design[type], null, {role: type});
        }
    }
    return -4; // 'busy'
}

function cull(type) {
}


function census() {
	var population;
	for (var i in Game.creeps) {
		
	}
}
function updateRealPop() {
    var role, name;
    clearRealPop();

    for (name in Game.creeps) {
        var creep = Game.creeps[name];
        if(!creep.my) {
            continue;
        }

        if ("role" in creep.memory) {
            role = creep.memory['role'];
            realPop[role]++;
        } else {
            if(Memory.idle == null) {
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

/// Scratch area
function buffDesign(design) {
    var buffedDesign = [];
    for (var i in design) {
    }
}


module.exports.census = census(room);


















