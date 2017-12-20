var util = require('common');
var _ = require('lodash');
var DEBUG_HARVEST = true;

function dlog(msg) {
    util.dlog('HARVEST', msg);
}
Creep.prototype.hitUp = function(target) {
        return hitUp(this, target);
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

function needMiner(room) {

    // calculate current mining througput vs energy left and time til regen
    var horsepower = 0;

    var miner = room.find(FIND_MY_CREEPS, {
        filter: (i) => i.memory.role == 'miner'
    });

    for (var guy in miner) {
        horsepower += miner[guy].getActiveBodyparts(WORK);
    }
    // WORK parts harvest 2 nrg per tick

    if (horsepower < 30) { // max useful is 20. added some margin;
        return true
    } else {
        return false
    }
}
module.exports.needMiner = needMiner;

function mine(creep) {
    // TODO - clean this crap up

    // Two scenarios - mining by worker, and mining by miner
    if (!util.def(creep.memory.sTarget)) {
        // Will return a mineshaft object or false if none available
        var posting = findSource(creep);
        if (posting) {
            creep.memory.sTarget = posting;
        } else if (creep.memory.role == 'miner') {

            // Prooobably should come up with a better solution here
            creep.say('AAAH MOTHERLAND')
                // creep.suicide();
            dlog('AAAAH MOTHERLAND')
            return false;
        } else {
            return false
        }
    }

    var posting = creep.memory.sTarget;
    //dlog('should be an id' + posting)
    var srcObj = Game.getObjectById(posting.srcId);

    // if (creep.pos.findPathTo(Game.getObjectById(posting.srcId)) ||
    // posting.assignedTo != creep.name && creep.memory.role != 'miner') {

    // dlog(creep.name + ' uh wut ' + posting.assignedTo + ' ' )
    // delete creep.memory.sTarget; false;
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
                    creep.memory.sTarget = null;
                } else {
                    if (refindSource(creep)) {
                        return true;
                    }
                    if (!needMiner(creep.room)) { // source overmined
                        //                       creep.say('AHHHHH MO')
                        //dlog('AAAHMOTHERLAND')
                        // creep.suicide();
                    }
                    // otherwise be patient. Or migrate? TODO scan for
                    // unoccupied shafts
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
                    creep.memory.sTarget = null;
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

    creep.say('💰F');
    var targ = Game.getObjectById(findCashMoney(creep));
    if (!util.def(targ)) {
        return false;
    }
    var res = hitUp(creep, targ);
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
                    strokeWidth: 1
                }
            });
            if (pap == OK || pap == ERR_TIRED) {
                return true;
            } else {
                return false
            }
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

    var target = Game.getObjectById(creep.memory.eTarget);
    // util.dumpObject(target)
    if (!util.def(target)) {
        dlog('zomg')

        delete creep.memory.eTarget;
        return false;
    }

    var res = hitUp(creep, target);
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

function scrounge(creep) {
    // TODO every 5 ticks or so we should check there is still something at the
    // stored tile
    // Otherwise any time something is dropped you might pull a bunch of
    // gatherers without need.
    // See if we are already on the move
    //
    //
    // var nrg = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
    // if (creep.pos.isNearTo(nrg)){
    // creep.pickup(nrg);
    // } else {
    // creep.moveTo(nrg)}
    //    
    // return
    //    
    if (!util.def(creep.memory.targetUpdated)) {
        creep.memory.targetUpdated = 0;
    } else if (!util.def(creep.memory.eTarget) && creep.memory.targetUpdated + 90 < Game.time) {
        // We already checked not too long ago, there isn't anything here
        return false;
    }
    //
    if (!util.def(creep.memory.eTarget) ||
        !util.def(Game.getObjectById(creep.memory.eTarget)) ||
        (creep.memory.targetUpdated + 90) < Game.time) { // If I
        // don't
        // have
        // a
        // target,
        // get
        // one
        var res = findEnergy(creep);

        if (!util.def(res) || !res) {
            // No energy. Mark it and remember
            delete creep.memory.eTarget;
            creep.memory.targetUpdated = Game.time;
            return false
        }
        // dlog('assigning new free energy target: ' + creep.name);
        creep.memory.eTarget = res;
        creep.memory.targetUpdated = Game.time;
    }


    var target = Game.getObjectById(creep.memory.eTarget);
    // util.dumpObject(target)
    if (!util.def(target)) {
        dlog('zomg')
    }
    var res = creep.hitUp(target);
    // TODO: possibly reuse path found earlier for more efficiency
    switch (res) {
        case OK:
        case ERR_FULL:
            return true;
            break;
        case ERR_NOT_IN_RANGE:
            var move = creep.moveTo(target, {
                reusePath: 15,
                visualizePathStyle: {
                    fill: 'green',
                    stroke: '#00ff00',
                    strokeWidth: .3,
                    opacity: .9,
                    lineStyle: 'dashed'
                }
            });

            // {
            // fill: 'transparent',
            // stroke: '#fff',
            // lineStyle: 'dashed',
            // strokeWidth: .15,
            // opacity: .1
            // }
            // width number
            // Line width, default is 0.1.
            // color string
            // Line color in any web format, default is #ffffff (white).
            // opacity number
            // Opacity value, default is 0.5.
            // lineStyle string
            // Either undefined (solid line), dashed, or dotted. Default is undefined.
            // // if (move == ERR_NO_PATH) {
            // delete creep.memory.eTarget;
            // dlog('hmm');
            // return false;
            // }
            return true;
            break;
        case ERR_NOT_ENOUGH_ENERGY:
            delete creep.memory.eTarget;
            return false;
            break;
        default:
            // delete creep.memory.eTarget;
            dlog("Error scrounging: " + util.getError(res) + ' ---- ' + res);
    }

    dlog('not quote sure how i got here but oh well')
    delete creep.memory.eTarget;

    return false
}

module.exports.scrounge = scrounge;

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

    if (creep.carry.energy == creep.carryCapacity) {
        creep.memory.taskState = 'SINK'
        if (util.def(creep.memory.sTarget)) {
            delete creep.memory.sTarget;
        }
    }
    if (creep.carry.energy == 0) {
        creep.memory.taskState = 'SOURCE'
    }

    if (creep.memory.taskState == 'SOURCE') {


        creep.say('💰');
        var targ = Game.getObjectById(findBacon(creep));
        if (!util.def(targ) || util.def(creep.memory.sTarget)) {
            // dlog('mining')
            return mine(creep);
        }
        var res = hitUp(creep, targ);
        // dlog("hitting up " + targ.pos.x + ',' + targ.pos.y + ' - ' +
        // util.getError(res))
        switch (res) {
            case OK:
                return true;
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
            if (!util.def(test) || !test ) {
                // dlog('unable to acquire new sink.');

                creep.memory.taskList.pop();

                return false;
            } else {
				dlog('said def')
                mySink = Game.getObjectById(test);
            }
            // util.dumpObject(mySink)}
            // gatherer(creep);
        }
        var res = creep.transfer(mySink, RESOURCE_ENERGY);
		return
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
                    return false
                }
                break;
            case ERR_FULL:
                delete creep.memory.sinkId;
                return false;
                break; // gatherer(creep); break;
            default:
                dlog('error sinking into ' + mySink.structureType + ': ' + util.getError(res));
                return false;
        }
    }
}

function distance(p1, p2) {
    return Math.floor(Math.sqrt(Math.pow((p1.x - p2.x), 2) +
        Math.pow((p1.y - p2.y), 2)));
}

function hitUp(creep, target) {
    if (!util.def(target)) {
        dlog('not suing hitup right.')
        return false;
    }
    if (util.def(target.resourceType)) {
        return creep.pickup(target);
    } else if (util.def(target.structureType)) {
        return creep.withdraw(target, RESOURCE_ENERGY);
    }
}
module.exports.hitUp = hitUp;

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
        return mine(creep);
    }
    return best.id;
}

function findSink(creep) {

	var targets = [];
	
    if (util.def(creep.room.memory.nrgReserve) && creep.room.memory.nrgReserve != false) {
        targets = creep.room.find(FIND_MY_SPAWNS, {
            filter: (i) => i.energy < i.energyCapacity
        });
	} 
	
 if (targets.length == 0) {
        var targets = creep.room.find(FIND_MY_STRUCTURES, {
            filter: (i) => i.energy < i.energyCapacity
        });
    }
	
	if (targets.length == 0) {
        return false;
    }

    // dlog('Finding sink for ' + creep.name);
    // //
    // var containersWithSpace = creep.room.find(FIND_STRUCTURES, {
    // filter: (i) => i.structureType == STRUCTURE_CONTAINER &&
    // i.store[RESOURCE_ENERGY] < i.storeCapacity[RESOURCE_ENERGY]
    // });

    // // support structures
    // var towers = creep.room.find(FIND_STRUCTURES, {
    // filter: (i) => i.structureType == STRUCTURE_TOWER &&
    // i.energy < i.energyCapacity
    // });

    // var targets = containersWithSpace.concat(towers);

    for (var x in targets) {
        var object = targets[x];
        object.distance = creep.pos.getRangeTo(object);
    }

    targets.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        }
        if (a.distance < b.distance) {
            return -1;
        }
        return 0;
    });

    // Check pathing before we return
    for (var y in targets) {
        var target = targets[y];
        var res = creep.moveTo(target, {
            reusePath: 15,
            visualizePathStyle: {
                opacity: 0.9,
                stroke: '#ff1122'
            }
        });
        if (res == OK || res == ERR_TIRED) {
            return target.id;
        }

    }
    //
    //
    // var distances = [];
    //
    // for (var i in structs) {
    // var struct = structs[i];
    // var structid = struct.id;
    // // dlog('is ' + struct.structureType + ' full? ' + isFull(struct))
    //
    // if ((struct.structureType == STRUCTURE_STORAGE) || (struct.structureType ==
    // STRUCTURE_EXTENSION) ||
    // (struct.structureType == 'spawn')) {
    //
    // // check there is a path
    // if ((creep.moveTo(struct) != ERR_NO_PATH) && (!isFull(struct))) {
    // // calculate distance
    // // dlog('adding candidate')
    // distances.push({
    // "structid": structid,
    // "distance": creep.pos.getRangeTo(struct),
    // });
    // // dlog('ID ' + structid + ' distance is '
    // // + distances[structid].toFixed(3));
    //
    // }
    // }
    // }
    //
    // // dlog('found ' + distances.length)
    //
    // if (!distances.length) {
    // // dlog('seems all the nrg storage is full! I should build nore....');
    // return
    // }
    //
    // // Sort by distances
    //
    // distances.sort(function(a, b) {
    // if (a.distance > b.distance) {
    // return 1;
    // }
    // if (a.distance < b.distance) {
    // return -1;
    // }
    // return 0;
    // });
    //
    // // Use first not-full option
    // for (var candidate in distances) {
    // if (distances[candidate].isFull) {
    // continue;
    // } else {
    // return distances[candidate].structid;
    // }
    // }

    // if we are here, there are no non-full sinks. just move to the closest one
    // and wait
    return distances[0].structid;

    // TODO: Add storage logic
    // if ([ STRUCTURE_EXTENSION, 'storage' ].indexOf(struct.structureType)
    // == -1) {
    // continue;
    // }

    // All extensions and spawns are full. Hit up the controller then
    // for ( var i in structs) {
    // var struct = structs[i];
    // if ((struct.structureType == STRUCTURE_CONTROLLER)) {
    // return struct;
    // }
    // }
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

function refindSource(creep) {
    // Balance miners on sources in room, and then soemthing

    var sources = creep.room.memory.sources;

    if (!util.def(sources)) {
        return false
    }


    var manpower = creep.room.find(FIND_MY_CREEPS, {
        filter: (i) => i.memory.role == 'miner'
    });

    var counter = [];
    for (var x = 0; x < sources.length; x++) {
        counter[x] = 0;
    }

    for (var disrc in sources) {
        var disId = sources[disrc].id;

        for (var dude in manpower) {
            if (!util.def(manpower[dude].memory.sTarget) || !util.def(manpower[dude].memory.sTarget.srcId)) {
                //maybe just spawned
                continue;
            }
            if (manpower[dude].memory.sTarget.srcId == disId) {
                counter[disrc]++;
            }
        }

        return false;


    }
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
        // console.log(sink.structureType + ": " + sink.store +
        // "/"+sink.storeCapacity);
        return sink.store == sink.storeCapacity;
    }
}
