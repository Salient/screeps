var util = require('common');
var harvest = require('harvester');

module.exports.disperse = function(creep) {
    creep.say('🔱');
    if (!util.def(creep.memory.wanderlust)) {
        creep.memory.wanderlust = {
            sporeFrom: creep.room.name
        };
    }

    if (creep.getActiveBodyparts(CLAIM) == 0) {
        //        creep.memory.role = 'worker'; return false;
        dlog(creep.name + ' scout identity crisis')
        creep.memory.role = 'worker';
        return false;
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
            if (res != OK) {
                dlog('error moving to exit: ' + util.getError(res));
                util.dumpObject({
                    pos: wander.nextPortal
                })
                delete wander.nextPortal;
                return false;
            } else {
                return true
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


    // So I've made it to  another room. 
    if (util.def(creep.room.controller && creep.room.controller.level != 0)) {
        // this room is already claimed. mosey on.
        wanderlust.sporeFrom = creep.room; // reset origin, go off and explore once more
        return true;
    } else { creep.leaveRoom();
    
    }


    //	if (creep.carry.energy != creep.carryCapacity && creep.taskState != 'IN_WORK') {
    //        creep.addTask('filltank'); // We want to load up for the long journey ahead
    //        return true;
    //	}
    //
    if (creep.carry.energy == 0) {
        creep.memory.taskState = 'SOURCE'
        creep.addTask('filltank');
        return true;
    }

    if (creep.taskState == 'SINK') {
        var ctrl = creep.room.controller;

        var res = creep.claimController(ctrl);
        switch (res) {
            case OK:
                return true;
                break;
            case ERR_NOT_IN_RANGE:
                creep.moveTo(ctrl);
                break;
            case ERR_GCL_NOT_ENOUGH:
                var res = creep.reserveController(ctrl);
                switch (res) {
                    case OK:
                        return true;
                        brea;
                    case ERR_NOT_IN_RANGE:
                        creep.moveTo(ctrl);
                        break;
                    default:
                        dlog(creep.name + ' error reserving ' + util.getError(res));

                }
            default:
                dlog(creep.name + ' error claiming ' + util.getError(res));

        }

    }

}

function dlog(msg) {
    util.dlog('SPORES', msg);
}
