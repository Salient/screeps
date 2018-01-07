var util = require('common');
var harvest = require('harvester'); // useful for energy finding routines

// Structure.prototype.needsWorkers = function() {
// var attendees = this.memory.workers;
// var maxAttendees = this.memory.maxWorkers;
//
// if (typeof attendees === 'undefined') {
// attendees = 0;
// }
//
// if (typeof maxAttendees === 'undefined') {
// maxAttendees = 1; // If not defined, be conservative to prevent log
// // jams
// }
// var count = 0;
// attendees.sort();
// for (var creep in attendees) {
// if (attendees[creep].hits > 0) {
// count++;
// } else {
// destroy(attendees[creep]);
// }
// }
// }
//
// Structure.prototype.needsRepair = function() {
// return this.hits < this.hitsMax * .8;
// };
//
// Structure.prototype.isDone = function() {
// return (this.hits == this.hitsMax);
// };

function builder(creep) {
    // Take a look around the room for something to do
    creep.say('⚒')

    if (creep.carry.energy == creep.carryCapacity) {
        creep.memory.taskState = 'SINK';
    }

    if (creep.carry.energy == 0) {
        creep.memory.taskState = 'DONE';
        creep.changeTask('filltank');
        return true;
    }

    //if (creep.memory.taskState == 'SOURCE') {
    //		return harvest.fillTank(creep);
    //	}

    if (!util.def(creep.memory.bTarget) ||
        !util.def(Game.getObjectById(creep.memory.bTarget))) {
        var orders = findSite(creep) || repairDuty(creep);
        if (!util.def(orders) || orders == false) {
            dlog(creep.name + ' says nothing to build or repair, converting to technician')
    creep.changeTask('technician');
            return true;
        } else {
            creep.memory.bTarget = orders;
        }
    }

    var target = Game.getObjectById(creep.memory.bTarget);
    if (!util.def(target)) {
        dlog('problem is here');
        creep.memory.bTarget = null;
        return false;
    }

    // check if done
    if (util.def(target.hits) && (target.hits == target.hitsMax)) {
        targetId = null
        creep.say('Done!')
        return true;
    }

    if (target.progress >= 0) {

        var res = creep.build(target);
        switch (res) {
            case OK:
                creep.say(sayProgress(target) + '%');
                return true;
                break;
            case ERR_NOT_IN_RANGE:
                var derp = creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: {
                        stroke: '1ffaa00'
                    }
                });
                if (derp == OK || derp == ERR_TIRED) {
                    return true;
                } else {
                    return false
                }
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.taskState = 'DONE';
                creep.changeTask('filltank');
                return true;
                break;
            case ERR_RCL_NOT_ENOUGH:
                creep.memory.taskList.pop();
                creep.memory.bTarget = null;
                return false;
                break;
            default:
                dlog('Build command error: ' + util.getError(res));
                return false;
        }

    } else if (needsRepair(target)) {

        if ((creep.pos.isNearTo(target)) && (creep.carry.energy > 0)) {
            creep.say(sayProgress(target) + '%');
            creep.repair(target)
            return true;

        } else if (creep.carry.energy == creep.carryCapacity) {
            var res = creep.moveTo(target, {
                reusePath: 5,
                visualizePathStyle: {
                    stroke: '1ffaa00'
                }
            });
            if (res == OK || res == ERR_TIRED) {
                return true;
            } else {
                return false;
            }


        } else {
            return harvest.fillTank(creep);
        }

    } else {
        // console.log('clearing target ' + creep.name + ' target: '
        // + target.structureType + ' ' + target.hits + '/'
        // + target.hitsMax);
        dlog('builder unsure what to do with target ' + target.id)
        return false;
    }
}

module.exports.builder = builder;

function needsRepair(target) {
    // console.log('needs repair? ' + target.hits + '/' + target.hitsMax);
    return target.hits < (target.hitsMax / 2);
}

function repairDuty(creep) {
    return false;
    var structures = creep.room.find(FIND_MY_STRUCTURES);
    var options = [];

    // TODO: can I sort structures in order of damage?
    for (var i in structures) {
        var s = structures[i];

        var intendedPath = creep.checkPath(s);
        // Check if path exists!! Otherwise, builders can block each other

        if (s.hits === null) {
            continue;
        }

        if (s.needsRepair()) {
            var res = creep.moveTo(s, {
                reusePath: 5,
                visualizePathStyle: {
                    stroke: '1ffaa00'
                }
            });
            creep.repair(s);
        }
    }
}

function findSite(creep) {

    if (creep.getActiveBodyparts(WORK) == 0) {
        creep.memory.taskList.pop();
        return false;
    }

    if (!util.def(creep.memory.bTarget) ||
        !util.def(Game.getObjectById(creep.memory.bTarget))) {
        // If not listed then it's built by nearest after all these are done
        var buildPriority = ['extension', 'container', 'storage', 'tower',
            'spawn', 'link', 'rampart', 'road', 'constructedWall'
        ];

        var newTarget = creep.room.find(FIND_MY_CONSTRUCTION_SITES);

        if (!util.def(newTarget)) {
            dlog('no build targets. untasking')
            creep.memory.taskList.pop();
            return false;
        }

        // Prioritize
        for (var need in buildPriority) {
            var priority = buildPriority[need];
            for (var site in newTarget) {
                if (newTarget[site].structureType == priority) {

                    creep.memory.bTarget = newTarget[site].id;
                    dlog('assinging ' + creep.name + ' build target ' +
                        priority);
                    return newTarget[site].id;
                }
            }
        }
    }
    return false;
}

module.exports.findSite = findSite;
module.exports.upgradeRC = upgradeRC;

function upgradeRC(creep) {
    var rc = creep.room.controller;
    creep.say('🔧')
    if (creep.getActiveBodyparts(WORK) == 0) {
        creep.memory.taskList.pop();
        return false;
    }

    if (creep.carry.energy == creep.carryCapacity) {
        creep.memory.taskState = 'SINK';
    }

    if (creep.carry.energy == 0) {
        creep.memory.taskState = 'DONE';
        creep.changeTask('filltank');
        return true;
    }

    //    if (creep.memory.taskState == 'SOURCE') {
    //       return harvest.fillTank(creep);
    //}

    if (rc.my) {
        var res = creep.upgradeController(rc);
    } else {
        var res = creep.claimController(rc);
    }

    switch (res) {
        case OK:
            creep.say(sayProgress(rc) + "%");
            return true;
            break;
        case ERR_NOT_IN_RANGE:
            var path = creep.moveTo(rc, {
                reusePath: 5,
                visualizePathStyle: {
                    stroke: '1ffaa00'
                }
            });
            if (path != OK && path != ERR_TIRED) {
                return false;
                dlog('Tech path error: ' + util.getError(path));
            } else {
                return true;
            }
            break;
        case ERR_NOT_ENOUGH_RESOURCES:
            creep.memory.taskState = 'DONE';
            creep.changeTask('filltank');
            return true;
            break;
        case ERR_NO_BODYPART:
            return false;

        default:
            dlog(creep.name + '- technician default error: ' + util.getError(res) + ' (' + res + ')');
            dlog('owner is ' + rc.owner)
            return false;
    }
}


function sayProgress(target) {

    if (util.def(target.progress)) {
        return parseInt((target.progress / target.progressTotal) * 100);
    } else if (target.hits !== null) {
        return parseInt((target.hits / target.hitsMax) * 100);
    } else {
        dlog('say what?')
    }
}

function dlog(msg) {
    util.dlog('CONSTRUCTION', msg);
}
