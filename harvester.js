var util = require('common');
var planning = require('cityPlanning');
var _ = require('lodash');
var DEBUG_HARVEST = true;

function dlog(msg, creep) {
    if (creep) {
        util.dlog('HARVEST/' + creep.name + ': ', msg);
    } else {
        util.dlog('HARVEST: ', msg);
    }
}

Creep.prototype.outsource = function() {
    var ovr = Memory.Overmind.globalTerrain;

    this.taskState = 'SOURCE'
    var srcs = this.room.memory.sources;
    if (util.def(srcs)) {
        for (var thing in srcs) {
            var realthing = Game.getObjectById(srcs[thing].id);
            if (realthing && realthing.ticksToRegeneration < 80) {
                // no need to leave room, more is on the way soon
                return true;
            }
        }
        // nothing coming soon. leave room.
        // this.leaveRoom();
        // return true;
    }
    // shoulding get here
    //
    // return false;
    // return this.exploreNewRoom();
    // outsourcing disabled

    // this.log(' outsourcing')
    if (ovr.length < 2) {
        this.log('derp')
        return false;
    };

    var score = 0;
    // var best = (Object.keys(ovr)[0] == this.room.name) ? Object.keys(ovr)[1]
    // : Object.keys(ovr)[0];
    var best = null;

    for (var land in ovr) {
        if (land == this.room.name) {
            continue;
        }

        var promised = ovr[land];

        if (promised.class == 'conquered' || promised.class == 'wasteland' || promised.class == 'heathens') {
            continue;
        }

        var range = Game.map.getRoomLinearDistance(this.room.name, land);
        if (promised.score / range > score) {
            score = promised.score / range;
            best = land;
        }
    }
    if (!util.def(best)) {
        this.exploreNewRoom();
    }
    this.leaveRoom(best);
    return true;
}

Creep.prototype.hitUp = function(target) {
    if (!util.def(target)) {
        this.log('not suing hitup right. Got: ' + target)
        util.dumpObject(target);

        return false;
    }
    if (util.def(target.resourceType)) {
        return this.pickup(target);
    } else if (util.def(target.structureType)) {
        return this.withdraw(target, RESOURCE_ENERGY);
    } else {
        this.log('what kind of twisted object is this?');
    }
}


// Drop what I'm doing and top off
Creep.prototype.fillTank = function() {
    this.changeTask('filltank');
    return fillTank(this);
}

Room.prototype.needMiner = function() {

    // TODO - figure out miners for reserved and unclaimed rooms

    // calculate current mining througput vs energy left and time til regen
    var horsepower = 0;

    var miner = this.find(FIND_MY_CREEPS, {
        filter: (i) => i.memory.role == 'miner' && i.ticksToLive > 300
    });

    if (!this.memory.sources) {
        planning.setupSources(this);
    }
    // Should at least have a miner for every source...
    // At least, below level 6 or so
    if (miner.length < this.memory.sources.length && this.controller.level < 6) {
        return true;
    }


    // This code is mainly for optimizing early room build order
    for (var guy in miner) {
        horsepower += miner[guy].getActiveBodyparts(WORK);
    }
    // WORK parts harvest 2 nrg per tick

    if (horsepower * 2 < 20) { // max useful is 20. added some margin;
        return true
    } else {
        return false
    }
}

function mine(creep) {
    // TODO - clean this crap up

    // Two scenarios - mining by worker, and mining by miner
    if (!util.def(creep.memory.mTarget) || !Game.getObjectById(creep.memory.mTarget)) {
        // Will return a mineshaft object or false if none available
        var post = findSource(creep);
        if (!util.def(post) || !post) {
            return false;
        }
        var newsrc = Game.getObjectById(post.srcId);
        if (creep.memory.role == 'worker' && newsrc.energy == 0 && newsrc.ticksToRegeneration > 40) {
            return false;
        }
        creep.memory.mTarget = post;
    }

    var posting = creep.memory.mTarget;
    var srcObj = Game.getObjectById(creep.memory.mTarget.srcId);

    if (!util.def(srcObj)) {
        // creep.log('this is very strange')
        // util.dumpObj(posting)
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
                if (!creep.room.controller.my) {
                    Memory.Overmind.globalTerrain[creep.room.name].lastHarvest = Game.time;
                    Memory.Overmind.globalTerrain[creep.room.name].score++;
                }
                return true;
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                if (creep.memory.role != 'miner') {
                    creep.memory.mTarget = null;
                } else {
                    // Check if any other sources in the room do not have a
                    // miner already assigned.
                    checkSourceMiners(creep)
                }
                // we don't want to return false when a miner does it's job too
                // well
                return true;
                // return false;
                break;
            case ERR_TIRED:
                creep.log('tire')
                return true;
                break;
            default:
                creep.log(' Error trying to mine source ' + posting +
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
        creep.log(' mine error : ' + util.getError(res))
    }
    return false
}

module.exports.mine = mine

module.exports.fillTank = function(creep) {

    if (creep.carry.energy == creep.carryCapacity) {
        if (creep.taskState != "SPECIAL") {
            creep.taskState = 'SINK';
        }
        return false;
    }

    creep.say('🔌');
    var targ = Game.getObjectById(creep.memory.eTarget);

    if (!util.def(targ)) {
        var res = findCashMoney(creep);
        if (!res) {
            if (creep.getActiveBodyparts(WORK) > 0) {
                if (mine(creep)) {
                    return true;
                }
                creep.room.tankMiss();
                return false;
            }

            // dlog('no available energy')
            // TODO - add storage check here?
            // TODO - use this situation to modify some behavior coefficients
            // dlog(creep.name + ' out shuttle');
        }
        creep.memory.eTarget = res;
        targ = Game.getObjectById(res);
    }

    var res = creep.hitUp(targ);
    // dlog("hitting up " + targ.pos.x + ',' + targ.pos.y + ' - ' +
    // util.getError(res))
    switch (res) {
        case OK:
            return true;
            break;
        case ERR_NOT_IN_RANGE:
            var pap = creep.moveTo(targ, {
                reusePath: 15,
                visualizePathStyle: {
                    stroke: '1ffaa00',
                    opacity: 1,
                    // strokeWidth: 1
                }
            });
            if (pap == OK || pap == ERR_TIRED) {
                return true;
            } else {
                dlog('improve here');
                return false
            }
            break;
        case ERR_NOT_ENOUGH_RESOURCES:
            delete creep.memory.eTarget;
            break;
        default:
            creep.log('fill tank catch: ' + util.getError(res) + '()' + res)
            return false;
    }
}

function findContainer(creep) {
    var newTargets = creep.room.find(FIND_STRUCTURES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    });

    if (!util.def(newTargets) || newTargets.length == 0) {
        creep.log(' asdf here')
        return false // No containers in the room. Bail.
    }

    var targets = [];
    // util.dumpObject(newTargets);
    for (var blob in newTargets) {
        var candidate = newTargets[blob];

        if (candidate.store == 0) {
            creep.log('oops');
            continue;
        }



        // var path = creep.pos.findPathTo(candidate, { ignoreCreeps: true});
        var path = creep.pos.findPathTo(candidate);
        if (!util.def(path) || path.length == 0 ||
            creep.moveTo(candidate, {
                reusePath: 15,
                visualizePathStyle: {
                    opacity: 0.9,
                    stroke: '#aa11aa'
                }
            })
        ) {
            creep.log('oh')
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
        creep.log('no container targes')
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

// function shuttle(creep) {
// // Get energy from containers and move it to spawn
// // dlog(creep.name + ' in shuttle')
//
// if (!util.def(creep.memory.sinkId) ||
// !util.def(Game.getObjectById(creep.memory.sinkId))) { // in case it's
// // been
// // destroyed
// creep.memory.sinkId = findSink(creep);
// }
//
// var mySink = Game.getObjectById(creep.memory.sinkId);
//
// if (!util.def(creep.memory.eTarget)) {
// // ?? var result =
// var res = findCashMoney(creep);
// if (!res) {
// // dlog(creep.name + ' out shuttle');
// return false;
// }
// creep.memory.eTarget = res;
// }
// dlog('shuttle')
// var target = Game.getObjectById(creep.memory.eTarget);
// // util.dumpObject(target)
// if (!util.def(target)) {
// dlog('zomg')
//
// delete creep.memory.eTarget;
// return false;
// }
//
// var res = creep.hitUp(target);
// // TODO: possibly reuse path found earlier for more efficiency
// switch (res) {
// case OK:
// case ERR_FULL:
// return true;
// break;
// case ERR_NOT_ENOUGH_RESOURCES:
// delete creep.memory.eTarget;
// return false;
// break;
// case ERR_NOT_IN_RANGE:
// var move = creep.moveTo(target, {
// reusePath: 15,
// visualizePathStyle: {
// stroke: 'fffaaf0'
// }
// });
// if (move == ERR_NO_PATH) {
// delete creep.memory.cTarget;
// dlog('hmm');
// return false;
// }
// return true;
// break;
// }
// }
//
// module.exports.shuttle = shuttle;

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
        if (!util.def(path) || path.length == 0 ||

            creep.moveTo(candidate, {
                reusePath: 15,
                visualizePathStyle: {
                    opacity: 0.9,
                    stroke: '#cc8800'
                }
            })

            ||
            candidate.amount < 75) {
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
            creep.log('Energy crisis! Retasking to gatherer')
            creep.addTask('gatherer');
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

    // TODO - add a mode where they search for energy outside the room. like a
    // scout, but without claim part

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
        creep.addTask('miner');
    }

    // Done dropping off
    if (creep.carry.energy == 0) {
        if (creep.taskState == 'SINK' && creep.room.memory.nrgReserve == false) {
            // pop job just in case something else needs doing
            creep.memory.taskState = "SOURCE";
            return false;
        }
        creep.memory.taskState = 'SOURCE';
        if (util.def(creep.memory.sinkId)) {
            delete creep.memory.sinkId;
        }
    }

    // Done filling up
    if (creep.carry.energy == creep.carryCapacity) {
        creep.taskState = 'SINK';
        if (util.def(creep.memory.eTarget)) {
            delete creep.memory.eTarget;
        }
    }

    switch (creep.taskState) {
        case 'SINK':
            creep.say('🛢️');
            return sink();
            break;
        case 'SOURCE':
            creep.say('💰');
            return (source() || creep.outsource());
            break;
        case 'SPECIAL':
            creep.taskState = 'SINK';
            return sink();
            break;
        default:
            creep.log('Gather logic fallthru: ' + creep.taskState);
            creep.taskState = 'SOURCE'; // default to something
            return false;
    }

    function source() {

        // check if already mining
        var targ = Game.getObjectById(creep.memory.mTarget);
        if (util.def(targ) && mine(creep)) {
            return true;
        }

        // find energy
        targ = Game.getObjectById(creep.memory.eTarget);
        if (!util.def(targ)) {
            delete creep.memory.eTarget;
            var rst = findBacon(creep);
            if (!util.def(rst)) {
                // dlog('mining')
                if (mine(creep)) {
                    return true;
                }

                creep.room.tankMiss();
                return false;
                // creep.log('tried to mine, result was ' + tres)
                // if (!tres) {
                // creep.taskState = "LEAVING";
                // creep.changeTask('builder');
                // return true;
                // }
                // return tres;
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
                    reusePath: 15,
                    visualizePathStyle: {
                        opacity: 0.9,

                        stroke: '00FF00'
                    }
                });
                if (pap == OK || pap == ERR_TIRED) {
                    return true
                } else {
                    creep.log('debug info gatherer source move error: ' + util.getError(pap))
                    delete creep.memory.eTarget;
                    return false;
                }
                break;
            default:
                creep.log('gatherer catch: ' + util.getError(res))
                return false;
        }
    }

    // 💰
    // ⚒️
    // 🔧
    function sink() {
        // That night he had a stomach ache

        var mySink = Game.getObjectById(creep.memory.sinkId);


        if (!util.def(mySink) || (isFull(mySink) && (mySink.room.name == creep.room.name))) {

            delete creep.memory.sinkId;
            var test = findSink(creep);

            if (!util.def(test) || !test) {
                // creep.log('unable to acquire new sink.');
                if (!creep.room.memory.nrgReserve) {
                    // creep.log(creep.name + ' invalid sink target, returned '
                    // + test);
                }
                // creep.memory.taskList.pop();

                return false;
            } else {
                creep.memory.sinkId = test;
                mySink = Game.getObjectById(test);
            }
        }
        var res = creep.transfer(mySink, RESOURCE_ENERGY);
        // return
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
                    creep.log('debug info gatherer sink move error: ' + util.getError(derp))
                    return false
                }
                break;
            case ERR_FULL:
                delete creep.memory.sinkId;
                return true;
                break; // gatherer(creep); break;
            default:
                creep.log('error sinking into ' + mySink.structureType + ': ' + util.getError(res));
                delete creep.memory.sinkId;
                return false;
        }

    }
    creep.log('gatherer fallthru, task state: ' + creep.taskState);
    creep.room.memory.strategy.economy.gatherMiss++;
    return false
}

function distance(p1, p2) {
    return Math.floor(Math.sqrt(Math.pow((p1.x - p2.x), 2) +
        Math.pow((p1.y - p2.y), 2)));
}

function findCashMoney(creep) {

    // Shouldn't be any workers sniffing around if we don't have a controller in
    // this room yet
    if (!util.def(creep.room.controller)) {
        return false;
    }

    // Sane defaults
    if (!util.def(creep.room.memory.strategy)) {
        return false;
    }

    var cash = [
        creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: (i) => i.amount > 50 && i.resourceType == RESOURCE_ENERGY
        }),
        creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (i) => (i.structureType == STRUCTURE_CONTAINER) &&
                i.store[RESOURCE_ENERGY] > 50
        })
    ];

    if (util.def(creep.room.storage)) {
        if (!util.def(creep.room.memory.strategy.economy.energyReservePerLevel)) {
            var storageReserves = 20000 * creep.room.controller.level;
        } else {
            storageReserves = creep.room.memory.strategy.economy.energyReservePerLevel * creep.room.controller.level;
        }

        if (util.def(creep.room.storage) && creep.room.storage.store[RESOURCE_ENERGY] > storageReserves) {
            cash.push(creep.room.storage);
        }
    }

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
        return false
    }
    return best.id;
}

module.exports.findCashMoney = findCashMoney;

function findBacon(creep) {

    var cash = [];

    for (var lnk in creep.room.memory.links) {
        if (creep.room.memory.links[lnk].dir == "source") {
            var linkobj = Game.getObjectById(lnk);
            if (linkobj && !util.def(linkobj.progress)) {
                cash.push(linkobj);
            }
        }
    }

    cash.push(creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
        filter: (i) => i.amount > 50 && i.resourceType == RESOURCE_ENERGY
    }));

    cash.push(creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (i) => i.structureType == STRUCTURE_CONTAINER &&
            i.store[RESOURCE_ENERGY] > 50
    }));


    var storageReserves = 20000;
    if (!creep.room.memory.strategy) {
        return
    }
    if (util.def(creep.room.memory.strategy.economy.energyReservePerLevel) && util.def(creep.room.controller)) {
        storageReserves = creep.room.memory.strategy.economy.energyReservePerLevel * creep.room.controller.level;
    }

    // Special case
    if (creep.room.memory.nrgReserve) {
        var storage = creep.room.storage;
        if (util.def(storage) && storage.store[RESOURCE_ENERGY] > storageReserves) {
            cash.push(storage);
        }
    }

    var score = 0;
    var best = null;

    for (var money in cash) {
        if (!util.def(cash[money])) {
            continue;
        }

        var option = cash[money];
        // util.dumpObj(option);
        var size = (util.def(option.amount) ? option.amount : (util.def(option.energy) ? option.energy : option.store[RESOURCE_ENERGY]));
        var range = creep.pos.getRangeTo(option);

        if (size / range > score) {
            score = size / range;
            best = option;
        }
    }

    if (score == 0 || !util.def(best)) {
        creep.room.memory.strategy.economy.gatherMiss++;
        return null;
    }
    return best.id;
}

function findSink(creep) {


    // var sinkPriority = [STRUCTURE_LINK, STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
    // STRUCTURE_TOWER, STRUCTURE_POWER_SPAWN, STRUCTURE_STORAGE];
    var sinkPriority = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE];

    if (creep.room.memory.nrgReserve) {
        sinkPriority.pop(); // Pop off storage, lest we get into a loop sourcing
        // and sinking back to storage
    }

    if (!util.def(creep.room.memory.cache)) {
        creep.room.memory.cache = {}
    }

    var cache = creep.room.memory.cache;
    if (!util.def(cache.sinkStructures) || !cache.sinkStructures.expires || cache.sinkStructures.expires < Game.time) {
        cache.sinkStructures = {};
        // refresh sink structure cache
        var aptStructures = creep.room.find(FIND_MY_STRUCTURES, {
            filter: (i) => (sinkPriority.indexOf(i.structureType) > -1)
        });

        cache.sinkStructures.ids = [];

        if (creep.room.memory.links) {
            var linkSet = creep.room.memory.links;
            for (var linkid in linkSet) {
                if (linkSet[linkid].dir == 'sink') {
                    cache.sinkStructures.ids.push(linkid);
                }
            }
        }

        for (var struct in aptStructures) {
            cache.sinkStructures.ids.push(aptStructures[struct].id);
        }
        cache.sinkStructures.expires = Game.time + 200 + util.getRand(1, 20);
    }

    var targets = cache.sinkStructures.ids;

    var distance = {};

    for (var x in targets) {
        var target = Game.getObjectById(targets[x]);
        if (!target) {
            continue;
        }

        if (!target.my) {
            dlog('smeep')
            continue
        }
        distance[targets[x]] = creep.pos.getRangeTo(target);
    }

    var keysSorted = Object.keys(distance).sort(function(a, b) {
        return distance[a] - distance[b]
    });

    if (Object.keys(distance).length == 0) {
        // dlog(creep.name + ': no sink targets in this room, trying origin');
        // dlog(Memory.rooms[creep.memory.birthRoom].spawnId)
        // dlog(creep.name + '/' + creep.room.name + ': fix me sink')
        return Memory.rooms[creep.memory.birthRoom].spawnId;
        // return false;
    }

    // dlog('finding sink in ' + creep.room.name + ', targets: ' + targets)

    var backup = false;
    var best = null;
    var score = null;

    for (var need in sinkPriority) {
        var priority = sinkPriority[need];
        dance:
            for (var sink in keysSorted) {
                var potential = Game.getObjectById(keysSorted[sink]);
                if (potential.structureType == priority && potential.isActive()) {
                    var space = (potential.structureType == STRUCTURE_STORAGE) ? (potential.store[RESOURCE_ENERGY] < potential.storeCapacity) : (potential.energy < potential.energyCapacity);
                    if (space) {
                        if (!backup) {
                            backup = potential.id;
                        }

                        for (var dibs in Game.dibsList) {
                            if (potential.id == Game.dibsList[dibs]) {
                                continue dance;
                            }
                        }
                        var pew = creep.moveTo(potential, {
                            reusePath: 15,
                            visualizePathStyle: {
                                opacity: 0.9,
                                stroke: '#22FF10'
                            }
                        });
                        if (pew == OK || pew == ERR_TIRED) {
                            return potential.id;
                        } else {
                            creep.log('found something good but path blocked or something: ' + util.getError(pew))
                        }
                    }
                }
            }
    }

    // don't want to error completely just because somebody else is headed to
    // the same place
    if (backup != false) {
        return backup;
    }

    // dlog('no sinks in ' + creep.room.name + ', backup is ' + backup + ',
    // priority is ' + priority + ', and reserve is ' +
    // creep.room.memory.nrgReserve);
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

        var srcObj = Game.getObjectById(thisSource);
        if (srcObj.energy < 100) {
            continue;
        }
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
                creep.log('a strange and serious event');
                continue;
            }

            if (thisShaftId == thisSource && assigneeRole == 'miner' && shafts[thisShaft].assignedTo != creep.name) {
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
                if (shafts[old].srcId == thisSource) {
                    if ((shafts[old].assignedTo == 'unassigned') || (Game.creeps[shafts[old].assignedTo].memory.role != 'miner')) {
                        shafts[old].assignedTo = creep.name;
                        creep.memory.mTarget = shafts[old];
                        return true;
                    }
                }
            }

        }

    }
    return false;

}

module.exports.forager = function(creep) {



}

function findSource(creep) {

    // TODO balance shaft assignment across sources

    var recall = creep.room.memory;

    if (!util.def(recall.shafts) || !util.def(recall.sources)) {
        creep.log('creep trying to find source in a room not setup!');
        planning.bootstrap(creep.room);
        return false;
    } else {
        var shafts = recall.shafts
        var sources = recall.sources;
    }

    if (sources.length == 0) {
        return false;
    }

    if (!util.def(recall.lastAssignedSrc) && recall.sources[0]) {
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
            if (mineHole.energy == 0) {
                continue;
            }

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
    // dlog('No mineshafts available...');
    creep.taskState = 'LEAVING'
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
        // "/" + sink.storeCapacity);
        return sink.store[RESOURCE_ENERGY] == sink.storeCapacity;
    }
}
