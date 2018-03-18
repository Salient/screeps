var util = require('common');
var harvest = require('harvester');
var ovrmnd = require('overmind');

Creep.prototype.appropriate = function(ctrlId) {

    var ctrl = Game.getObjectById(ctrlId);

    if (!ctrl || !ctrl.structureType || ctrl.structureType != STRUCTURE_CONTROLLER) {
        dlog('derp')
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
            var res2 = this.claimController(ctrl);
            switch (res2) {
                case OK:
                    return OK;
                    break;
                case ERR_GCL_NOT_ENOUGH:
                    return this.reserveController(ctrl);
                default:
                    this.log('nope: ' + res2 + ', ' + util.getError(res2));
            }
            return this.claimController(ctrl);
        } else {
            return this.attackController(ctrl);
        }
    } else {
        var res = this.claimController(ctrl);
        if (res != ERR_GCL_NOT_ENOUGH) {
            return res;
        } else {
            var spre = this.reserveController(ctrl);
            return this.reserveController(ctrl);
        }
    }
}

function selectNewRoom(creep) {

    var targetList = ovrmnd.getPriority();
    if (!targetList || targetList.length == 0) {
        dlog('no target in new room celect list');
        //            creep.leaveRoom();
        return false;;
    }

    var score = 0;
    var best = null;

    for (var land in targetList) {
        var promised = targetList[land];
        if (promised == creep.room.name) {
            continue; // skip where we already are
        }
        if (Memory.Overmind.globalTerrain && Memory.Overmind.globalTerrain[promised]) {

            var type = Memory.Overmind.globalTerrain[promised].class;
            // dlog('type is ' + type);
            if(!util.def(type)) {
                dlog('type is undef - object dump is ');
            util.dumpObj(Memory.Overmind.globalTerrain[promised]);
            }
        }
        // if (util.def(null))

        var range = Game.map.getRoomLinearDistance(creep.room.name, promised);
        var prophecy = Memory.Overmind.globalTerrain[promised];
        if (!util.def(prophecy.score)) {
            // hmmm
            creep.leaveRoom(prophecy); // go score it
            //prophecy.score = 1;
        }

        if (prophecy.score / range > score) {
            score = prophecy.score / range;
            best = promised;
        }
    }

    if (util.def(best)) {
        objective = best
        return best;
    } else {
        dlog('some bad error here');
        return false;
    }
}


module.exports.infest = function(creep) {

    //for (var flag in Game.flags) {
    //        var thisFlag = Game.flags[flag];
    //        // util.dumpObj(thisFlag
    //        if (thisFlag.room.name != creep.room.name) {
    //            creep.log("moving to flag");
    //            creep.log(util.getError(creep.moveTo(thisFlag)));
    //            return true;
    //        }
    //    }
    //


    // return true;

    /*
    var objective = creep.memory.rTarget;
    if (!objective) {
        objective = selectNewRoom(creep);
        if (!objective) {
            dlog('cant infest, no new rooms given. exploring');
            creep.exploreNewRoom();
            return;
        }
        dlog(creep.name + '(' + creep.room.name + '): has new room to infest. leaving to ' + objective)

        creep.leaveRoom(objective);
        return true;
    }
    */

    creep.say('🔱');
    //        dlog(this.name, 'at next hop, currently in ' + lustRoute[0].room + ' on the way to ' +  lustRoute[lustRoute.length -1].room );
    //   dlog(this.name, 'at next hop, currently in ' + lustRoute[0].room + ' on the way to ' +  lustRoute[lustRoute.length -1].room );

    /* if (objective == creep.room.name) {
        // we have arrived
        if (!creep.room.controller) {
            dlog('target room has no controller. exploring.');
            creep.exploreNewRoom();
            delete objective;
            return;
        };
        */
    if (!util.def(creep.room.controller) || creep.role == 'scout') {
        var newtarg = selectNewRoom(creep);
        if (newtarg) {
            creep.leaveRoom(newtarg);
        } else {
            creep.leaveRoom();
        }
        return true;
    }
    var res = creep.appropriate(creep.room.controller.id);
    switch (res) {
        case OK:
        case ERR_TIRED:
            return true;
            break;
        case ERR_FULL:
            var newtarg = selectNewRoom(creep);
            if (newtarg) {
                creep.leaveRoom(newtarg);
                return true;
            }
            break;
        case ERR_NOT_IN_RANGE:
            var res = creep.moveTo(creep.room.controller, {
                reusePath: 15,
                visualizePathStyle: {
                    opacity: 0.9,
                    stroke: '#ffffff'
                }
            });
            break;
            //case ERR_GCL_NOT_ENOUGH:
        default:
            creep.log('error infesting, ' + util.getError(res)); //util.getError(res));
            return false;
            // }
    }
}



//module.exports.disperse = function(creep) {
//    return;
//    creep.say('🔱');
//    if (!util.def(creep.memory.wanderlust)) {
//        creep.memory.wanderlust = {
//            sporeFrom: creep.room.name
//        };
//    }
//
//    //    if (creep.getActiveBodyparts(CLAIM) == 0) {
//    //        //        creep.memory.role = 'worker'; return false;
//    //        dlog(creep.name + ' scout identity crisis')
//    //        creep.memory.role = 'worker';
//    //        return false;
//    //    }
//
//    if (util.def(creep.room.nrgReserve) && creep.room.nrgReserve != false) {
//        creep.changeTask('gatherrrer');
//        return true;
//    }
//
//    var wander = creep.memory.wanderlust;
//
//    // Determine initial state
//    if (creep.room.name == wander.sporeFrom && creep.carry.energy < creep.energyCapacity) { // Still in origin room. Fill up and head out. 
//        creep.taskState = 'SOURCE';
//        creep.addTask('fillup');
//        return true;
//    }
//
//    if (creep.room.name == wander.sporeFrom) { //Still in origin room. Head out.
//        if (util.def(wander.nextPortal)) {
//            var portal = new RoomPosition(wander.nextPortal.x, wander.nextPortal.y, wander.nextPortal.roomName);
//            var res = creep.moveTo(portal, {
//                reusePath: 5,
//                visualizePathStyle: {
//                    stroke: '61f22ff',
//                    opacity: 1
//                }
//            });
//            switch (res) {
//                case OK:
//                case ERR_TIRED:
//                    return true;
//                    break;
//                default:
//                    dlog('error moving to exit: ' + util.getError(res));
//                    delete wander.nextPortal;
//                    return false;
//            }
//        } else {
//            creep.say("that's it, i'm outta here");
//            var exits = creep.room.find(FIND_EXIT);
//            if (exits[0] != null) {
//                var portal = exits[Math.floor(Math.random() * exits.length)];
//                // Should be a RoomPosition object
//                wander.nextPortal = portal;
//                return true;
//            } else {
//                dlog('serious problem here')
//                return false;
//            }
//        }
//
//    }
//
//    if (!util.def(creep.room.controller)) {
//        creep.leaveRoom();
//        return true;
//    }
//
//    // So I've made it to  another room. 
//    if (util.def(creep.room.controller && creep.room.controller.level != 0)) {
//        // this room is already claimed. mosey on.
//        dlog(creep.name + ' in ' + creep.room.name + ' moving on')
//        creep.leaveRoom();
//        // creep.changeTask('technician')
//        return true;
//    }
//
//
//    //	if (creep.carry.energy != creep.carryCapacity && creep.taskState != 'IN_WORK') {
//    //        creep.addTask('filltank'); // We want to load up for the long journey ahead
//    //        return true;
//    //	}
//    //
//    if (creep.carry.energy == 0) {
//        creep.taskState = 'SOURCE'
//        creep.addTask('filltank');
//        return true;
//    }
//
//    if (creep.taskState == 'SINK') {
//        var ctrl = creep.room.controller;
//
//        var res = creep.claimController(ctrl);
//        switch (res) {
//            case OK:
//            case ERR_TIRED:
//                dlog('derrp')
//                return true;
//                break;
//            case ERR_NOT_IN_RANGE:
//                creep.moveTo(ctrl);
//                break;
//            case ERR_GCL_NOT_ENOUGH:
//                var res = creep.reserveController(ctrl);
//                switch (res) {
//                    case OK:
//                    case ERR_TIRED:
//                        return true;
//                        break;
//                    case ERR_NOT_IN_RANGE:
//                        var res = creep.moveTo(ctrl);
//                        switch (res) {
//                            case OK:
//                            case ERR_TIRED:
//                                return true;
//                                break;
//                            default:
//                                dlog('error reserving instead of claiming because GCL ' + util.getError(res));
//                                return false;
//                        }
//
//                        break;
//                    default:
//                        dlog(creep.name + '(' + creep.room.name + ')  error reserving ' + util.getError(res));
//
//                }
//            default:
//                dlog(creep.name + '(' + creep.room.name + ' error claiming ' + util.getError(res));
//
//        }
//
//    }
//
//    dlog('spore catch')
//    creep.taskState = 'SINK';
//    return false;
//}

function dlog(msg) {
    util.dlog('SPORES', msg);
}
