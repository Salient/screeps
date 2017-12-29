var util = require('common');
var _ = require('lodash');
var DEBUG_HARVEST = true;

function dlog(msg) {
    util.dlog('HARVEST', msg);
}

Creep.prototype.hitUp = function(target) {
    if (!util.def(target)) {
        dlog('not suing hitup right.')
        return false;
    }
    if (util.def(target.resourceType)) {
        return this.pickup(target);
    } else if (util.def(target.structureType)) {
        return this.withdraw(target, RESOURCE_ENERGY);
    } else {
        dlog('what kind of twisted object is this?');
    }
}

// / Utiilty functions
//
//
// Finds all stuff on the ground, returns object with resource types as keys
// function freeEnergy(room) {
//
// var sits = room.find(FIND_DROPPED_RESOURCES);
// var total = {};
// for (var dd in sits) {
// var clump = sits[dd];
// if (!util.def(total[clump.resourceType])) {
// total[clump.resourceType] = 0;
// }
// total[clump.resourceType] += clump.amount;
// }
// return total;
// }
//
// module.exports.freeEnergy = freeEnergy;
//
// Game.s = function() {
// for (var r in Game.rooms) {
// harvest.setupSources(Game.rooms[r]);
// }
// }

// Optimize energy gathering by available roles in the room
//module.exports.sortingHat = sortingHat; 
//function sortingHat(creep) {
//
//    var taskList = creep.memory.taskList;
//
//    var availPop = creep.room.memory.strategy.currentPopulation;
//
//    // initialize these two for
//    // testing later
//    // find the miners in the room
//    var assignments = {
//        'shuttle': 0,
//        'miner': 0,
//        'workerBee': 0
//    };
//
//    creep.room.find(FIND_MY_CREEPS).forEach(function(creeper, index, array) {
//        var jerksCurTask = creeper.memory.taskList;
//
//        if (!util.def(jerksCurTask)) {
//            dlog('Brain dead creep!');
//            return;
//        }
//
//        var curTask = jerksCurTask[jerksCurTask.length - 1];
//        if (typeof assignments[curTask] === 'undefined') {
//            assignments[curTask] = 0;
//        }
//        assignments[curTask]++;
//    });
//
//    // dlog('sorting ' + creep.name + ', role: ' + creep.memory.role)
//    switch (creep.memory.role) {
//
//        case 'gatherer': // default tasking for gatherer
//            if (util.def(availPop.workerBee) && util.def(availPop.miner)) {
//                if ((availPop.workerBee < availPop.miner) &&
//                    (availPop.workerBee > 0)) {
//                    if (assignments.shuttle <= assignments.miner) {
//                        creep.memory.taskList.push('shuttle')
//                    } else {
//                        creep.memory.taskList.push('gatherer')
//                    }
//                } else {
//                    creep.memory.taskList.push('janitor')
//                }
//            } else {
//                creep.memory.taskList.push('gatherer')
//            }
//
//            break;
//        case 'workerBee': // default tasking for worker bee
//            creep.memory.taskList.push('shuttle')
//            break;
//        default:
//            creep.memory.taskList.push('gatherer')
//    }
//
//}

//function findAlternateSource(creep) {
//
//    var option = findSource(creep);
//
//    while (option) {
//
//        if (Game.getObjectById(option.srcId).energy > 300) {
//            creep.memory.sTarget = option;
//            return option;
//        }
//    }
//    return false;
//}
Room.prototype.needMiner = function() {

    // calculate current mining througput vs energy left and time til regen
    var horsepower = 0;

    var miner = this.find(FIND_MY_CREEPS, {
        filter: (i) => i.memory.role == 'miner'
    });

    // Should at least have a miner for every source...
    if (miner.length < this.memory.sources.length) {
        return true;
    }
    // This code is mainly for optimizing early room build order
    for (var guy in miner) {
        horsepower += miner[guy].getActiveBodyparts(WORK);
    }
    // WORK parts harvest 2 nrg per tick

    if (horsepower * 2 < 30) { // max useful is 20. added some margin;
        return true
    } else {
        return false
    }
}

function mine(creep) {
    // TODO - clean this crap up

    // Two scenarios - mining by worker, and mining by miner
    if (!util.def(creep.memory.mTarget)) {
        // Will return a mineshaft object or false if none available
        var posting = findSource(creep);
        if (posting) {
            creep.memory.mTarget = posting;
        } else if (creep.memory.role == 'miner') {

            // Prooobably should come up with a better solution here
            creep.say('AAAH MOTHERLAND')
                // creep.suicide();
            dlog('AAAAH MOTHERLAND')
            return false;
        }
        return false
    }

    var posting = creep.memory.mTarget;
    //dlog('should be an id' + posting)
    var srcObj = Game.getObjectById(posting.srcId);

    if (!util.def(srcObj)) {
        delete creep.memory.mTarget;
        return false;
    }
    // if (creep.pos.findPathTo(Game.getObjectById(posting.srcId)) ||
    // posting.assignedTo != creep.name && creep.memory.role != 'miner') {

    // dlog(creep.name + ' uh wut ' + posting.assignedTo + ' ' )
    // delete creep.memory.mTarget; false;
    // }


    // No idea why this is needed.
    posting.pos = new RoomPosition(posting.pos.x, posting.pos.y, posting.pos.roomName);

    if (creep.pos.isEqualTo(posting.pos) &&
        ((creep.carry.energy < creep.carryCapacity) || (creep.carryCapacity == 0))) {
        var result = creep.harvest(srcObj);
        switch (result) {
            case OK:
                return true;
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                if (creep.memory.role != 'miner') {
                    creep.memory.mTarget = null;
                } else {
                    //Check if any other sources in the room do not have a miner already assigned.
                    checkSourceMiners(creep)
                        // we don't want to return false when a miner does it's job too well
                    return true;
                }
                return false;
                break;
            case ERR_TIRED:
                return true;
                break;
            default:
                dlog(' - ' + creep.name + ': Error trying to mine source ' + posting +
                    ', ' + util.getError(result))
                return false
        }
    } else if (creep.carry.energy == 0 || creep.memory.role == 'worker') {

        if (creep.memory.role == 'worker') {
            // worker can stall waiting for a miner to move that never will.
            var occupado = false;
            var check = creep.room.lookAt(posting);

            for (var item in check) {
                if (check[item].type == 'creep') {
                    creep.memory.mTarget = null;
                    return false;
                }
            }
        }
        var res = creep.moveTo(posting, {
            reusePath: 15,
            visualizePathStyle: {
                opacity: 0.9,
                stroke: '#ff1100'
            }
        });
        if (!res || res == ERR_TIRED) {
            return true;
        }
        dlog(creep.name + ' mine error : ' + util.getError(res))
    }
    return false
}

module.exports.mine = mine

function fillTank(creep) {
    creep.say('🔌');
    var targ = Game.getObjectById(creep.memory.eTarget);

    if (!util.def(targ)) {
        var res = findCashMoney(creep);
        if (!res) {
            if (creep.getActiveBodyparts(WORK) > 0) {
                mine(creep);
            }
            dlog('no available energy')
                // TODO - add storage check here?
                // TODO - use this situation to modify some behavior coefficients
                // dlog(creep.name + ' out shuttle');
            return false;
        }
        creep.memory.eTarget = res;
        targ = Game.getObjectById(targ);
    }

    var res = creep.hitUp(targ);
    //    dlog("hitting up " + targ.pos.x + ',' + targ.pos.y + ' - ' +
    //        util.getError(res))
    switch (res) {
        case OK:
            return true;
            break;
        case ERR_NOT_IN_RANGE:
            var pap = creep.moveTo(targ, {
                reusePath: 5,
                visualizePathStyle: {
                    stroke: '1ffaa00',
                    opacity: 1,
                    //    strokeWidth: 1
                }
            });
            if (pap == OK || pap == ERR_TIRED) {
                return true;
            } else {
                return false
            }
            break;
        case ERR_NOT_ENOUGH_RESOURCES:
            delete creep.memory.eTarget;
            return false;
            break;
        default:
            dlog('fill tank catch: ' + util.getError(res))
            return false;
    }
}
module.exports.fillTank = fillTank;

function findContainer(creep) {
    var newTargets = creep.room.find(FIND_STRUCTURES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    });

    if (!util.def(newTargets) || newTargets.length == 0) {
        dlog(' asdf here')
        return false // No containers in the room. Bail.
    }

    var targets = [];
    // util.dumpObject(newTargets);
    for (var blob in newTargets) {
        var candidate = newTargets[blob];

        if (candidate.store == 0) {
            dlog('oops');
            continue;
        }



        // var path = creep.pos.findPathTo(candidate, { ignoreCreeps: true});
        var path = creep.pos.findPathTo(candidate);
        if (!util.def(path) || path.length == 0 || creep.moveTo(candidate)) {
            dlog('oh')
            continue;
        }

        var tScore = candidate.store[RESOURCE_ENERGY] / path.length;
        targets.push({
            targetId: candidate.id,
            path: path,
            score: tScore
        });
    }


    if (!util.def(targets) || targets.length == 0) {
        dlog('no container targes')
        return false // No accessible energy in the room. Bail.
    }

    var hitList = targets.sort(function(a, b) {
        if (a.score > b.score) {
            return 1;
        }
        if (a.score < b.score) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    return hitList[0].targetId;
}

module.exports.findContainer = findContainer;

function shuttle(creep) {
    // Get energy from containers and move it to spawn
    // dlog(creep.name + ' in shuttle')

    if (!util.def(creep.memory.sinkId) ||
        !util.def(Game.getObjectById(creep.memory.sinkId))) { // in case it's
        // been
        // destroyed
        creep.memory.sinkId = findSink(creep);
    }

    var mySink = Game.getObjectById(creep.memory.sinkId);

    if (!util.def(creep.memory.eTarget)) {
        // ?? var result =
        var res = findCashMoney(creep);
        if (!res) {
            // dlog(creep.name + ' out shuttle');
            return false;
        }
        creep.memory.eTarget = res;
    }
    dlog('shuttle')
    var target = Game.getObjectById(creep.memory.eTarget);
    // util.dumpObject(target)
    if (!util.def(target)) {
        dlog('zomg')

        delete creep.memory.eTarget;
        return false;
    }

    var res = creep.hitUp(target);
    // TODO: possibly reuse path found earlier for more efficiency
    switch (res) {
        case OK:
        case ERR_FULL:
            return true;
            break;
        case ERR_NOT_ENOUGH_RESOURCES:
            delete creep.memory.eTarget;
            return false;
            break;
        case ERR_NOT_IN_RANGE:
            var move = creep.moveTo(target, {
                reusePath: 15,
                visualizePathStyle: {
                    stroke: 'fffaaf0'
                }
            });
            if (move == ERR_NO_PATH) {
                delete creep.memory.cTarget;
                dlog('hmm');
                return false;
            }
            return true;
            break;
    }
}

module.exports.shuttle = shuttle;

function findEnergy(creep) {

    var newTargets = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter: {
            resourceType: RESOURCE_ENERGY
        }
    });

    if (!util.def(newTargets) || newTargets.length == 0) {
        return false // No dropped energy in the room. Bail.
    }

    var targets = [];
    var totalE = 0;
    for (var blob in newTargets) {
        var candidate = newTargets[blob];
        totalE += candidate.amount;
        // var path = creep.pos.findPathTo(candidate, { ignoreCreeps: true});
        var path = creep.pos.findPathTo(candidate);
        if (!util.def(path) || path.length == 0 || creep.moveTo(candidate) || candidate.amount < 75) {
            continue;
        }

        var tScore = candidate.amount / path.length;
        targets.push({
            targetId: candidate.id,
            path: path,
            score: tScore
        });
    }

    if (totalE < 300) {
        if (creep.memory.taskList[creep.memory.taskList.length - 1] != 'gatherer') {
            dlog('Energy crisis! Retasking to gatherer')
            creep.memory.taskList.push('gatherer');
        }
    }
    if (!util.def(targets) || targets.length == 0) {
        return false // No accessible energy in the room. Bail.
    }
    var hitList = targets.sort(function(a, b) {
        if (a.score > b.score) {
            return 1;
        }
        if (a.score < b.score) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    return hitList[0].targetId;
}
module.exports.findEnergy = findEnergy;

function gatherer(creep) {

    // Priorities are:
    // 1. Pickup any free energy laying on the ground.
    // 2. Move energy from a container to extension/spawn if needed.
    // 3. Mine an energy source.
    //
    //
    // On the first day, he ate one apple
    // but he was still hungry

    // return bringHomeBacon(creep);
    if (creep.getActiveBodyparts(CARRY) == 0) {
        // damaged worker or confused miner
        creep.memory.taskList.push('miner');
    }

    if (creep.carry.energy == creep.carryCapacity) {
        creep.memory.taskState = 'SINK';
        if (util.def(creep.memory.eTarget)) {
            delete creep.memory.eTarget;
        }
    }

    if (creep.carry.energy == 0) {
        creep.memory.taskState = 'SOURCE';
    }

    if (creep.memory.taskState == 'SOURCE') {
        var targ = Game.getObjectById(creep.memory.mTarget);
        if (util.def(targ)) {
            return mine(creep);
        }

        creep.say('💰');
        targ = Game.getObjectById(creep.memory.eTarget);
        if (!util.def(targ)) {
            var rst = findBacon(creep);
            if (!util.def(rst)) {
                // dlog('mining')
                var tres = mine(creep);
                return tres;
            } else {
                targ = Game.getObjectById(rst);
                creep.memory.eTarget = rst;
            }
        }
        var res = creep.hitUp(targ);
        // dlog("hitting up " + targ.pos.x + ',' + targ.pos.y + ' - ' +
        // util.getError(res))
        switch (res) {
            case OK:
                return true;
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.eTarget = findBacon(creep);
                break;
            case ERR_NOT_IN_RANGE:
                var pap = creep.moveTo(targ, {
                    reusePath: 5,
                    visualizePathStyle: {
                        opacity: 0.9,

                        stroke: '00FF00'
                    }
                });
                if (pap == OK || pap == ERR_TIRED) {
                    return true
                } else {
                    dlog('debug info gatherer source move error: ' + util.getError(pap))
                    return false;
                }
                break;
            default:
                dlog('gatherer catch: ' + util.getError(res))
                return false;
        }

    }

    // 💰
    // ⚒️
    // 🔧

    if (creep.memory.taskState == 'SINK') {
        creep.say('🛢️');
        // That night he had a stomach ache
        var mySink = Game.getObjectById(creep.memory.sinkId);
        // util.dumpObject(mySink)

        if (!util.def(mySink) || isFull(mySink)) {
            var test = findSink(creep);
            if (!util.def(test) || !test) {
                // dlog('unable to acquire new sink.');
                // dlog('invalid sink target')

                //        creep.memory.taskList.pop();

                return false;
            } else {
                mySink = Game.getObjectById(test);
            }
            // util.dumpObject(mySink)}
            // gatherer(creep);


            //if (mySink.structureType == STRUCTURE_SPAWN) {
            //            mySink.renewCreep(creep);
            //        }
            // var quant = (mySink.energyCapacity - mySink.energy < creep.energy ) ? mySink.energyCapacity - mySink.energy : creep.energy;
            var res = creep.transfer(mySink, RESOURCE_ENERGY);
            //        return
            switch (res) {
                case OK:
                    return true;
                    break;
                case ERR_NOT_IN_RANGE:
                    var derp = creep.moveTo(mySink, {
                        reusePath: 15,
                        visualizePathStyle: {
                            opacity: 0.9,
                            stroke: '#ffaaff'
                        }
                    });
                    if (derp == OK || derp == ERR_TIRED) {
                        return true;
                    } else {
                        dlog('debug info gatherer sink move error: ' + util.getError(derp))
                        return false
                    }
                    break;
                case ERR_FULL:
                    delete creep.memory.sinkId;
                    return true;
                    break; // gatherer(creep); break;
                default:
                    dlog('error sinking into ' + mySink.structureType + ': ' + util.getError(res));
                    return false;
            }
        }
    }
    dlog('gatherer fallthru ');
    return false
}

function distance(p1, p2) {
    return Math.floor(Math.sqrt(Math.pow((p1.x - p2.x), 2) +
        Math.pow((p1.y - p2.y), 2)));
}

function findCashMoney(creep) {

    var cash = [creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: (i) => i.amount > 50 && i.resourceType == RESOURCE_ENERGY
        }),
        creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_CONTAINER &&
                i.store[RESOURCE_ENERGY] > 50
        }),
        creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_EXTENSION &&
                i.energy > 50
        })
    ];

    var score = 0;
    var best = null;

    for (var money in cash) {
        if (!util.def(cash[money])) {
            continue;
        }

        var option = cash[money];
        var size = (util.def(option.amount) ? option.amount : (util.def(option.energy) ? option.energy : option.store[RESOURCE_ENERGY]));
        var range = creep.pos.getRangeTo(option);

        if (size / range > score) {
            score = size / range;
            best = option;
        }
    }

    if (score == 0 || !util.def(best)) {
        return false;
    }
    return best.id;
}

module.exports.findCashMoney = findCashMoney;

function findBacon(creep) {

    var cash = [creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: (i) => i.amount > 50 && i.resourceType == RESOURCE_ENERGY
        }),
        creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_CONTAINER &&
                i.store[RESOURCE_ENERGY] > 50
        })
    ];

    var score = 0;
    var best = null;

    for (var money in cash) {
        if (!util.def(cash[money])) {
            continue;
        }

        var option = cash[money];
        var size = (util.def(option.amount) ? option.amount : (util.def(option.energy) ? option.energy : option.store[RESOURCE_ENERGY]));
        var range = creep.pos.getRangeTo(option);

        if (size / range > score) {
            score = size / range;
            best = option;
        }
    }

    if (score == 0 || !util.def(best)) {
        return null;
    }
    return best.id;
}

function findSink(creep) {

    //var sinkPriority = [STRUCTURE_LINK, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_POWER_SPAWN, STRUCTURE_STORAGE];
    var sinkPriority = [STRUCTURE_LINK, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE];

    var targets = creep.room.find(FIND_MY_STRUCTURES);

    if (targets.length == 0) {
        dlog('no sink targets in this room');
        return false;
    }

    for (var x in targets) {
        var object = targets[x];
        object.distance = creep.pos.getRangeTo(object);
    }

    // Might as well find the closest priority 
    targets.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        }
        if (a.distance < b.distance) {
            return -1;
        }
        return 0;
    });

    for (var need in sinkPriority) {
        var priority = sinkPriority[need];
        for (var sink in targets) {
            var potential = targets[sink];
            if (potential.structureType == priority) {
                var space = (priority == STRUCTURE_STORAGE) ? (potential.store[RESOURCE_ENERGY] < potential.storeCapacity) : (potential.energy < potential.energyCapacity);
                if (space) {
                    var pew = creep.moveTo(potential);
                    if (pew == OK || pew == ERR_TIRED) {
                        return potential.id;
                    }
                }
            }
        }
    }
    return false;
}

module.exports.gatherer = gatherer;

function findOverhead(creep) {
    if (creep.room.memory.nrgReserve) {
        return false
    } else {
        return false
    }
}
module.exports.findOverhead = findOverhead;

function checkSourceMiners(creep) {
    // Balance miners on sources in room, and then soemthing

    // For miners only
    if (creep.memory.role != 'miner') {
        return false;
    }

    var sources = creep.room.memory.sources;

    if (!util.def(sources) || sources.length == 0) {
        return false
    }

    var shafts = creep.room.memory.shafts;

    if (!util.def(shafts) || shafts.length == 0) {
        return false
    }


    for (var thisSource in sources) {

        var thisSrcId = sources[thisSource].id;
        var found = false;

        for (var thisShaft in shafts) {
            var thisShaftId = shafts[thisShaft].srcId;

            // Check if the assignment is still valid
            if (!Game.creeps[shafts[thisShaft].assignedTo]) {
                shafts[thisShaft].assignedTo = 'unassigned';
                continue;
            }

            var assigneeRole = Game.creeps[shafts[thisShaft].assignedTo].memory.role;
            if (!util.def(assigneeRole)) {
                dlog('a strange and serious event');
                continue;
            }

            if (thisShaftId == thisSrcId && assigneeRole == 'miner') {
                found = true;
                break;
            }
        }

        if (found) {
            // Check next source
            continue;
        } else {
            // doesn't seem to be a miner assigned to this source
            // Remove existing shaft assignment
            for (var old in shafts) {
                if (shafts[old].assignedTo == creep.name) {
                    shafts[old].assignedTo = 'unassigned';
                }
            }

            for (var old in shafts) {
                if ((shafts[old].srcId == thisSrcId) && (Game.creeps[shafts[old].assignedTo].memory.role != 'miner')) {
                    shafts[old].assignedTo = creep.name;
                    creep.memory.mTarget = shafts[old];
                }
            }

        }

    }

}

module.exports.forager = function(creep) {



}

function findSource(creep) {

    // TODO balance shaft assignment across sources

    var recall = creep.room.memory;

    if (!util.def(recall.shafts) || !util.def(recall.sources)) {
        dlog('creep trying to find source in a room not setup!');
        return false;
    } else {
        var shafts = recall.shafts
        var sources = recall.sources;
    }

    if (!util.def(recall.lastAssignedSrc)) {
        recall.lastAssignedSrc = sources[0].id;
    }

    // See if this creep already have a reservation, i.e., worker returning
    for (var post in shafts) {
        if (shafts[post].assignedTo == creep.name) {
            return shafts[post];
        }
    }

    // Search once quickly for any spots at the source not chosen last

    for (var post in shafts) {

        var mineHole = shafts[post];

        // If it's abandoned, or if a miner needs priority over a worker
        if (!Game.creeps[mineHole.assignedTo] || (creep.memory.role == 'miner' && (Game.creeps[mineHole.assignedTo].memory.role == 'worker'))) {
            if (shafts[post].srcId == recall.lastAssignedSrc) {
                var backupShaft = mineHole;
            } else {
                mineHole.assignedTo = creep.name;
                recall.lastAssignedSrc = mineHole.srcId;
                return mineHole;
            }
        }
    }

    // Didn't find anything at our preferred source. Was there another option?
    if (util.def(backupShaft)) {
        recall.lastAssignedSrc = backupShaft.srcId;
        backupShaft.assignedTo = creep.name;
        return backupShaft;
    }

    // Whelp...i guess nothing is available
    //    dlog('No mineshafts available...');
    return false;
}

function isFull(sink) {
    // console.log(sink.structureType + ": " + sink.energy +
    // "/"+sink.energyCapacity);
    if ((sink.structureType == STRUCTURE_EXTENSION) ||
        (sink.structureType == STRUCTURE_SPAWN)) {
        // console.log(sink.structureType + ": " + sink.energy +
        // "/"+sink.energyCapacity);
        return sink.energy == sink.energyCapacity;
    } else if (sink.structureType == 'storage') {
        console.log(sink.structureType + ": " + sink.store +
            "/" + sink.storeCapacity);
        return sink.store == sink.storeCapacity;
    }
}
