var util = require('common');
var harvest = require('harvester');
var ovrmnd = require('overmind');

Creep.prototype.appropriate = function(ctrlId) {

    var ctrl = Game.getObjectById(ctrlId);

    if (!ctrl || !ctrl.structureType || ctrl.structureType != STRUCTURE_CONTROLLER) {
        return ERR_INVALID_ARGS;
    }

    if (ctrl.level > 0) {
        //somebody owns this room
        if (ctrl.my) {
            return ERR_FULL;
        } else {
            return this.attackController(ctrl);
        }
    } else if (ctrl.reservation) {
        var res = ctrl.reservation.username;
        if (res == util.myName) {
            return this.claimController(ctrl);
        } else {
            return this.attackController(ctrl);
        }
    } else {
        return this.claimController(ctrl);
    }
    dlog('wtf scout mess');
}

module.exports.infest = function(creep) {

    creep.say('🔱');
    var objective = creep.memory.rTarget;
    if (!objective) {
        var targetList = ovrmnd.getPriority();
        if (!targetList || targetList.length == 0) {
            dlog('big bad boo');
            return false;
        }

        var score = 0;
        var best = null;

        dlog('target list is ');

        for (var land in targetList) {
            var promised = targetList[land];
            var range = creep.pos.getRangeTo(promised);
            var promised = targetList[land];

            if (promised.score / range > score || promised.score == NaN) {
                dlog(land)
                score = promised.score / range;
                best = land;
            }
        }

        dlog(best)
        var bestRoom = Game.rooms[best];
        if (bestRoom.controller) {
            objective = best.controller.id;
        } else {
            dlog('poop');
            return false;
        }
    }


    var res = creep.appropriate(objective);
    switch (res) {
        case OK:
        case ERR_TIRED:
            dlog('derrp')
            return true;
            break;
        case ERR_NOT_IN_RANGE:
            creep.moveTo(ctrl);
            break;
            //case ERR_GCL_NOT_ENOUGH:
        default:
            dlog('error infesting, ' + util.getError(res));
            return false;
    }
    dlog(creep.name + ' in ' + creep.room.name + ', ppooop');
}



module.exports.disperse = function(creep) {
    creep.say('🔱');
    if (!util.def(creep.memory.wanderlust)) {
        creep.memory.wanderlust = {
            sporeFrom: creep.room.name
        };
    }

    //    if (creep.getActiveBodyparts(CLAIM) == 0) {
    //        //        creep.memory.role = 'worker'; return false;
    //        dlog(creep.name + ' scout identity crisis')
    //        creep.memory.role = 'worker';
    //        return false;
    //    }

    if (util.def(creep.room.nrgReserve) && creep.room.nrgReserve != false) {
        creep.changeTask('gatherer');
        return true;
    }

    var wander = creep.memory.wanderlust;

    // Determine initial state
    if (creep.room.name == wander.sporeFrom && creep.carry.energy < creep.energyCapacity) { // Still in origin room. Fill up and head out. 
        creep.taskState = 'SOURCE';
        creep.addTask('fillup');
        return true;
    }

    if (creep.room.name == wander.sporeFrom) { //Still in origin room. Head out.
        if (util.def(wander.nextPortal)) {
            var portal = new RoomPosition(wander.nextPortal.x, wander.nextPortal.y, wander.nextPortal.roomName);
            var res = creep.moveTo(portal, {
                reusePath: 5,
                visualizePathStyle: {
                    stroke: '61f22ff',
                    opacity: 1
                }
            });
            switch (res) {
                case OK:
                case ERR_TIRED:
                    return true;
                    break;
                default:
                    dlog('error moving to exit: ' + util.getError(res));
                    delete wander.nextPortal;
                    return false;
            }
        } else {
            creep.say("that's it, i'm outta here");
            var exits = creep.room.find(FIND_EXIT);
            if (exits[0] != null) {
                var portal = exits[Math.floor(Math.random() * exits.length)];
                // Should be a RoomPosition object
                wander.nextPortal = portal;
                return true;
            } else {
                dlog('serious problem here')
                return false;
            }
        }

    }

    if (!util.def(creep.room.controller)) {
        creep.leaveRoom();
        return true;
    }

    // So I've made it to  another room. 
    if (util.def(creep.room.controller && creep.room.controller.level != 0)) {
        // this room is already claimed. mosey on.
        dlog(creep.name + ' in ' + creep.room.name + ' moving on')
        creep.leaveRoom();
        // creep.changeTask('technician')
        return true;
    }


    //	if (creep.carry.energy != creep.carryCapacity && creep.taskState != 'IN_WORK') {
    //        creep.addTask('filltank'); // We want to load up for the long journey ahead
    //        return true;
    //	}
    //
    if (creep.carry.energy == 0) {
        creep.taskState = 'SOURCE'
        creep.addTask('filltank');
        return true;
    }

    if (creep.taskState == 'SINK') {
        var ctrl = creep.room.controller;

        var res = creep.claimController(ctrl);
        switch (res) {
            case OK:
            case ERR_TIRED:
                dlog('derrp')
                return true;
                break;
            case ERR_NOT_IN_RANGE:
                creep.moveTo(ctrl);
                break;
            case ERR_GCL_NOT_ENOUGH:
                var res = creep.reserveController(ctrl);
                switch (res) {
                    case OK:
                    case ERR_TIRED:
                        return true;
                        break;
                    case ERR_NOT_IN_RANGE:
                        var res = creep.moveTo(ctrl);
                        switch (res) {
                            case OK:
                            case ERR_TIRED:
                                return true;
                                break;
                            default:
                                dlog('error reserving instead of claiming because GCL ' + util.getError(res));
                                return false;
                        }

                        break;
                    default:
                        dlog(creep.name + '(' + creep.room.name + ')  error reserving ' + util.getError(res));

                }
            default:
                dlog(creep.name + '(' + creep.room.name + ' error claiming ' + util.getError(res));

        }

    }

    dlog('spore catch')
    creep.taskState = 'SINK';
    return false;
}

function dlog(msg) {
    util.dlog('SPORES', msg);
}
