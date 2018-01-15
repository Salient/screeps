var util = require('common');
var harvest = require('harvester');
var ovrmnd = require('overmind');

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
            var res = creep.moveTo(portal);
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
                        switch(res) {
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
                        dlog(creep.name + ' error reserving ' + util.getError(res));

                }
            default:
                dlog(creep.name + ' error claiming ' + util.getError(res));

        }

    }

    dlog('spore catch')
    creep.taskState = 'SINK';
    return false;
}

function dlog(msg) {
    util.dlog('SPORES', msg);
}
