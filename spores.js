var util = require('common');
var harvest = require('harvester');

module.exports.disperse = function(creep) {
    creep.say('🔱');
    if (!util.def(creep.memory.wanderlust)) {
        creep.memory.wanderlust = {
            sporeFrom: creep.room.name
        };
    }


    var wander = creep.memory.wanderlust;

    // Determine initial state
    //    if (creep.room.name == wander.sporeFrom && creep.carry.energy < creep.energyCapacity) { // Still in origin room. Fill up and head out. 
    //        creep.addTask('fillup');
    //        return true;
    //    }

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

    } else {
        creep.moveTo(creep.room.controller);
    }
    //	if (creep.carry.energy != creep.carryCapacity && creep.taskState != 'IN_WORK') {
    //        creep.addTask('filltank'); // We want to load up for the long journey ahead
    //        return true;
    //	}
    //
    //	if (creep.carry.energy == 0) {
    //		creep.memory.taskState = 'SOURCE'
    //		creep.memory.taskList.pop();
    //		return true;
    //	}
    //
    //	if (creep.memory.taskState == 'SOURCE') {
    //		return harvest.fillTank(creep);
    //	}

}

function dlog(msg) {
    util.dlog('SPORES', msg);
}
