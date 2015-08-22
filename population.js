var design = {
    "harvester": [WORK, CARRY, CARRY, MOVE, MOVE],
    "upgrade":   [WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY],
    "builder":   [WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY],
    "guard": [TOUGH, ATTACK, MOVE, MOVE]
};

var DesiredPop = {
    "harvester": 4,
    "upgrade": 2,
    "builder": 4,
    "guard": 2
};

var emptyPop = {
    "harvester": 0,
    "upgrade": 0,
    "builder": 0,
    "guard": 0
}

var importance = ["guard", "harvester", "builder", "upgrade"];
var realPop = Memory.realPop;

module.exports = function () {
    var creeps = Game.creeps,
    delta = {};

    updateRealPop();

    for(var type in DesiredPop) {
        var count = DesiredPop[type];
        log(type + ' ' + realPop[type] + "/" + count);

        if (realPop[type] < count) {
            //console.log("Need more " + type);
            delta[type] = 1;
        } else if (realPop[type] > count) {
            delta[type] = -1;
        }
    }

    for(var i in importance) {
        var type = importance[i];
        if(delta[type] == 1) {
            // Return so we don't try to create more than 1 per tick - last will win
            return create(type);
        } else if (delta[type] == -1) {
            cull(type);
        }
    }
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



















