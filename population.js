var util = require('common');
var strat = require('strategy');


Room.prototype.popCount = function() {
    return this.find(FIND_MY_CREEPS).length
}

// Takes in an array of body parts
var getCost = function(body) {
    var cost =0;
    for (var part in body) {
        var bodyPart = body[part];
        if (util.def(BODYPART_COST[bodyPart])){
            cost += BODYPART_COST[bodyPart];
        } else {return ERR_NO_BODYPART}
    }
}


var census = function(room) {
    var roles = { worker: 0, soldier: 0, miner: 0, medic: 0, technician: 0};

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


// TODO change mining logic to only assign shafts to 'miner' class

function nextPriority(room) {
    // Check if room setup
    if (!room.memory.planned) {
        return
    }

    dlog('arbitrating spawn')
    //  Four main castes 
    //      1. Worker (Equal parts move, carry, work)
    //      2. Soldier (Move, tough, attack, ranged_attack)
    //      3. Medic (Move, tough, heal)
    //      4. Miner (Move, work)
    //
    // Main selection parameters:
    //  Energy Production:
    //      If lots of dropped energy in the room, we need more shuttles to go get it.
    //      Always need a minimum of 3 workers to boot strap room
    //
    //      Should start making miners after min. 3 workers, as number of shafts available vs. other priorities
    //      
    //  Tech Tree:
    //      If more than X number of construction sites, need more workers
    //  Military Production:
    //

    // Verify room population
    var have = census(room);

    if (have.worker <3) { return 'worker'}
    var builds = room.find(FIND_MY_CONSTRUCTION_SITES);
    var nrg = room.find(FIND_DROPPED_RESOURCES);
    var needsOfTheFew = { 
        'worker':  builds.length * 10 + nrg.length, 
        'miner': (Object.keys(room.memory.shafts).length - have.miner) * 25, 
        'soldier': 15 + ((6 - room.memory.strategy.defcon) * 20),
        'medic': (have.soldier * 10 ) -30
    }
util.dumpObject(needsOfTheFew);
    var needsOfTheMany = Object.keys(needsOfTheFew)
        .sort(function(keya, keyb) {
            return needsOfTheFew[keyb] - needsOfTheFew[keya];
        })

    // If the score is really high, the need is great. Have creep stop drawing from spawn/extensions until spawn is complete
    if (needsOfTheFew[needsOfTheMany[0]] > 100 )
        { room.memory.strategy.nrgReserve = true }
    
    return needsOfTheMany[0];
}

module.exports.nextPriority = nextPriority;

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


var spawn = function(room) {

    var want = nextPriority(room);

    var castes = strat.getCastes(room);

    if (!util.def(castes[want])) {
        dlog('wtf'); return false
    }

    var pattern = castes[want];

    var cap = room.energyCapacityAvailable;

    // Start casting the spell

    var body = []; 
    var counter = 0;
    var cost = 0;

    while (cost <= cap) {
        body.push(pattern[counter++ % pattern.length]);
        cost += BODYPART_COST[body[body.length-1]];
    }
    // last iteration put us over
    body.pop()


    var spawns = room.find(FIND_MY_SPAWNS);
    for (var uterus in spawns) {
        var babyMomma = spawns[uterus];
        if (!babyMomma.isActive()){
            continue;
        }
        if (util.def(babyMomma.spawning)) {
            if (Game.time + babyMomma.spawning.remainingTime < room.memory.nextSpawn ) {
                room.memory.nextSpawn = Game.time + babyMomma.spawning.remainingTime;
            }
        }
        
        
 var result = babyMomma.spawnCreep(body, want + '-' + (Math.floor((Math.random() * 10000))), { memory: {
            "role" : want,
            "birthRoom" : room.name,
            "taskList" : []
            }})
        switch (result) {
            case OK: dlog('Spawned ' + want);  room.memory.nrgReserve = false;  break;
            case ERR_NOT_ENOUGH_ENERGY: room.memory.nextSpawn = Game.time + 10; break;
            case ERR_BUSY: room.memory.nextSpawn = Game.time + babyMomma.spawning.remainingTime; break;
                default: dlog('Error spawning - ' + util.getError(result))
        }
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
                room.memory.nrgReserve = null;
                if (util.def(Game.flags['Next: ' + type])) {
                    Game.flags['Next: ' + type].remove();
                }
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
                        // return false;	


                        dlog('Stragey error! Not enough energy capacity to build creep')
                        if (room.memory.strategy.currentPopulation['peon'] <=7) {
                            dlog('spawning peon') 
                            var result = spawn.createCreep([MOVE,WORK,CARRY], 'peon'  
                                + (Math.floor((Math.random() * 10000))), {
                                    "role" : 'peon',
                                    "birthRoom" : room.name,
                                    "taskList" : ['gatherer', 'shuttle', 'builder']
                                });
                            return; }
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
                    room.createFlag(spawn.pos.x+1, spawn.pos.y+1, 'Next: ' + type) 
                    room.memory.nrgReserve = cashMoney; // Signal workers to leave this munch energy
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

function dlog(msg) {
    util.dlog('POPULATION', msg);
}
module.exports.census = census;
module.exports.breed = spawn;
module.exports.printDemographics = printDemographics;
