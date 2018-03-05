var util = require('common');
var strat = require('strategy');
var harvest = require('harvester');


// TODO increase spawn delay by population in room



//Room.prototype.popCount = function() {
//    return this.find(FIND_MY_CREEPS).length
//}

// Takes in an array of body parts
function getCost(body) {
    var cost = 0;
    for (var part in body) {
        var bodyPart = body[part];
        if (util.def(BODYPART_COST[bodyPart])) {
            cost += BODYPART_COST[bodyPart];
        } else {
            return ERR_NO_BODYPART
        }
    }
    return cost;
}

function census(room) {
    var roles = {
        worker: 0,
        soldier: 0,
        miner: 0,
        medic: 0,
        technician: 0
    };


    var roomCreeps = room.find(FIND_MY_CREEPS);
    for (var i in roomCreeps) {
        var youThere = roomCreeps[i];

        if (!util.def(Memory.creeps[youThere.name])) {
            continue; // somehow not in memory?
        }
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

    // Four main castes
    // 1. Worker (Equal parts move, carry, work)
    // 2. Soldier (Move, tough, attack, ranged_attack)
    // 3. Medic (Move, tough, heal)
    // 4. Miner (Move, work)
    //
    // Main selection parameters:
    // Energy Production:
    // If lots of dropped energy in the room, we need more shuttles to go get
    // it.
    // Always need a minimum of 3 workers to boot strap room
    //
    // Should start making miners after min. 3 workers, as number of shafts
    // available vs. other priorities
    //      
    // Tech Tree:
    // If more than X number of construction sites, need more workers
    // Military Production:
    //

    var popCon = room.memory.strategy.population;
    var econCon = room.memory.strategy.economy;

    if (!util.def(popCon)) {
        return false
    } // Not done setting up
    // Verify room population


    var have = census(room);
    var totalPop = 0;
    for (var i in have) {
        totalPop += have[i];
    }

    // Less, stronger creep > lots of weak creep
    if ((totalPop > room.controller.level * popCon.popPerLvl) ||
        totalPop > popCon.maxPop) {
        return false
    } // TODO tweak this number

    // Are we bootstrapping?
    //if (have.worker < popCon.minWorker || (have.miner > popCon.minWorker && have.worker < room.controller.level * 2)) { //arbitrary shenanigans here
    if (have.worker < popCon.minWorker) { //arbitrary shenanigans here
        dlog('Bootstrapping worker population')
        room.memory.nrgReserve = (room.energyAvailable > 300) ? room.energyAvailable : 300; // Guarantee we can still light this
        // rocket
        return 'worker'
    }

    var myGlobalRooms = 0;
    for (var rooms in Game.rooms) {
        if (Game.rooms[rooms].controller && Game.rooms[rooms].controller.my) {
        myGlobalRooms++;
        }
    }

    var scoutVeto = 1;
    if (myGlobalRooms >= Game.gcl.level-1){ // there should not be a -1 here, but somethign is messed up. remove it later
        scoutVeto = 0;
    }
    dlog("scout veto called: " + scoutVeto + ', global rooms: ' + myGlobalRooms + ', gcl: ' + Game.gcl.level);
    

    // How is the Economy? Are there enough workers transporting energy?
    var nrg = room.find(FIND_DROPPED_RESOURCES, {
        filter: {
            resourceType: RESOURCE_ENERGY
        }
    });
    var loot = 0;
    for (var glob in nrg) {
        loot += nrg[glob].amount;
    }

    // Are we over mining the room?
    var vetoMiner = (room.needMiner()) ? 1 : 0;

    // Are we under attack?
    var enemies = room.find(FIND_HOSTILE_CREEPS).length;

    var builds = room.find(FIND_MY_CONSTRUCTION_SITES).length;
    var needsOfTheFew = {
        'worker': builds * 5 + loot + popCon.minerWeight *
            (Object.keys(room.memory.shafts).length - have.miner),
        'miner': ((Object.keys(room.memory.shafts).length - have.miner) * have.worker) *
            popCon.minerWeight * vetoMiner,
        //'soldier': 15 + ((6 - room.memory.strategy.defcon) * 20),
        'medic': ((have.soldier - have.medic) * popCon.medicWeight),
        'scout': have.miner*(econCon.tankMiss + econCon.gatherMiss) * 4 * scoutVeto// only want to create spores when i'm near full production
    }
    var needsOfTheMany = Object.keys(needsOfTheFew).sort(function(keya, keyb) {
            return needsOfTheFew[keyb] - needsOfTheFew[keya];
        })
        // If the score is really high, the need is great. Have creep stop drawing
        // from spawn/extensions until spawn is complete
    if (needsOfTheFew[needsOfTheMany[0]] > 100) {
        //dlog(room.name + ' Need ' + needsOfTheMany[0] + ' with score ' + needsOfTheFew[needsOfTheMany[0]])
        //dlog(room.name + ' Next ' + needsOfTheMany[1] + ' with score ' + needsOfTheFew[needsOfTheMany[1]])
                room.memory.nrgReserve = room.energyCapacityAvailable;

        // TODO - put this somewhere more sensible
        if (needsOfTheMany[0] == 'scout') {
            // reset the economy counters to prevent spawing scouts forever more
            econCon.tankMiss = 0;
            econCon.gatherMiss = 0;
        }
        return needsOfTheMany[0];
    }
    return false;
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

    // for (var i in )

    var totalPop = room.find(FIND_MY_CREEPS).length;

    for (var c in currentPopulation) {
        var number = currentPopulation[c];
        if (c !== 'freeAgent') {
            console.log("There are " + number + " " + c + " creeps, making up " +
                (number / totalPop * 100).toFixed(2) +
                "% of the population. The goal is " + goalDemographics[c] *
                100 + "% (with minimum of " + minDemographics[c] + ').');
        }
    }
}

function openShaft(room) {

    if (!util.def(room.memory.shafts)) {
        return false;
    } else {
        var shafts = room.memory.shafts
    }

    for (var post in shafts) {
        if (!Game.creeps[shafts[post].assignedTo] &&
            shafts[post].assignedTo != 'choke') {
            return true;
        }
    }

    return false;
}

//function nrgGone(room) {
//	var ore = room.find(FIND_SOURCES);
//	for ( var ton in ore) {
//		var spot = ore[ton];
//		// if (spot.energy < 50 && spot.ticksToRegeneration > 30)
//	}
//}

//function needMiner(room) {
//
//	// calculate current mining througput vs energy left and time til regen
//	var horsepower = 0;
//	// var softCount =0;
//
//	var miner = room.find(FIND_MY_CREEPS);
//	for ( var guy in miner) {
//		var workCount = miner[guy].getActiveBodyparts(WORK);
//		if (miner[guy].memory.role == 'miner') {
//			horsepower += workCount
//		}
//		// softCount +=workCount;
//	}
//	// WORK parts harvest 2 nrg per tick
//
//	if (horsepower < 30) {
//		return true
//	} else {
//		return false
//	}
//}

var spawn = function(room) {
    // room.memory.nextSpawn = Game.time + 5;

    var reserve = room.memory.nrgReserve;

    if (!util.def(reserve)) {
        reserve = false;
    }
    if (!util.def(room.memory.planned)) {
        return false;
    }

    if (reserve != false && reserve > room.energyCapacityAvailable) {
        reserve = room.energyCapacityAvailable;
    }

    if (reserve != false && reserve > room.energyAvailable) {
        var justInCase = census(room);
        if (justInCase.worker < 3) {
            room.memory.nrgReserve = 300;
        } else {
            // dlog(room.name + ' has ' + room.energyAvailable + '/' + room.energyCapacityAvailable + ' energy, current goal is  ' + room.memory.nrgReserve + '. Delaying.');
            room.memory.nextSpawn = Game.time + ((room.energyCapacityAvailable - room.energyAvailable > 30) ? 30 : room.energyCapacityAvailable - room.energyAvailable);
            return false;
        }
    }

    var cap = (reserve == false) ? room.energyCapacityAvailable : reserve;

    // short cut if we are charging up
    var goodCall = false;
    var spawns = room.find(FIND_MY_SPAWNS);
    for (var uterus in spawns) {
        var babyMomma = spawns[uterus];
        if (!babyMomma.isActive()) {
            dlog('spawn inactive!')
            continue;
        }

        if (util.def(babyMomma.spawning)) {
            //			dlog('Time left spawning: ' + babyMomma.spawning.remainingTime)
            if (Game.time + babyMomma.spawning.remainingTime < room.memory.nextSpawn) {
                dlog('setting spawn timer')
                room.memory.nextSpawn = Game.time +
                    babyMomma.spawning.remainingTime;
                continue;
            }
        } else {
            goodCall = true
        }
    }

    if (!goodCall) {
        return false
    }

    var want = nextPriority(room);
    if (!want) {
        // Nothing really important to spawn right now. Check back in 90
        // seconds.
        dlog('do not want!')
        room.memory.nextSpawn = Game.time + 30;
        return false;
    } // do not want

    var castes = room.getCastes();

    if (!util.def(castes[want])) {
        dlog('wtf');
        return false
    }

    var pattern = castes[want];

    // Start casting the spell
    var body = [];
    var counter = 0;
    var cost = 0;

    while (cost <= cap && body.length <51) {
        body.push(pattern[counter++ % pattern.length]);
        cost += BODYPART_COST[body[body.length - 1]];
    }
    // last iteration put us over
    body.pop()

    var result = babyMomma.spawnCreep(body, 'Lvl' + body.length + '_' + want + '_' +
        (Math.floor((Math.random() * 10000))), {
            memory: {
                role: want,
                birthRoom: room.name,
                taskList: [],
                taskState: 'SOURCE'
            }
        })
    switch (result) {
        case OK:
            if (want == 'scout') {
                if (util.def(room.memory.strategy) && util.def(room.memory.strategy.economy)) {
                    room.memory.strategy.economy.gatherMiss = 0;
                    room.memory.strategy.economy.tankMiss = 0;
                }
            }
            dlog(room.name + ' spawned ' + want);
            room.memory.nextSpawn = Game.time + body.length * CREEP_SPAWN_TIME;
            room.memory.nrgReserve = false;
            break;
        case ERR_NOT_ENOUGH_ENERGY: // Pick a body that will fit under 300 to make
            // sure it procs
            if (room.memory.nrgReserve) {
                //dlog(room.name + ' rice and beans spawning ' + want);
                break;
            } else {
                //room.memory.nextSpawn = Game.time + (cap - room.energyAvailable)/50*10;
                room.memory.nextSpawn = Game.time + 30;
                //dlog('planning to spawn ' + want + ' but not enough energy yet')
                return;
            } // Try again in 90 sec s
            break;
            // while (getCost(body)> 300) { body.pop(); }
            // var ddd = util.getError(babyMomma.spawnCreep(body, want + '-' +
            // (Math.floor((Math.random() * 10000))), { memory: {
        case ERR_BUSY:
            dlog('huh? thats impossiblei');
            break;
        default:
            dlog('Error spawning - ' + util.getError(result))
            dlog(body)
            dlog(want)
    }
    if (babyMomma.spawning) {
        room.memory.nextSpawn = Game.time + babyMomma.spawning.remainingTime;
        return true
    }
    room.memory.nextSpawn = Game.time + 30; // Try again in 90 sec
    return true;
}

function dlog(msg) {
    util.dlog('POPULATION', msg);
}
module.exports.census = census;
module.exports.spawn = spawn;
module.exports.printDemographics = printDemographics;
