var util = require('common');
var harvest = require('harvester');

module.exports.disperse = function(creep) {
    if (!util.def(creep.memory.wanderlust)) {
        creep.memory.wanderlust = {};
    }
    
    creep.say('🔱 ')

    creep.memory.taskList.pop();
    creep.memory.taskList.push('busywork');
    return true;

	if (creep.carry.energy != creep.carryCapacity) {
        creep.memory.taskList.pop();
		harvest.fillTank(creep);
        return true;
	}

	if (creep.carry.energy == 0) {
		creep.memory.taskState = 'SOURCE'
		creep.memory.taskList.pop();
		return true;
	}

	if (creep.memory.taskState == 'SOURCE') {
		return harvest.fillTank(creep);
	}
    if (util.def(creep.memory.wanderlust .nextPortal)) {
        creep.moveTo(creep.memory.wanderlust .nextPortal);
    } else {
        creep.say("that's it, i'm outta here");
        var exits = creep.room.find(FIND_EXIT);
        if (exits[0] != null) {
            var portal = exits[Math.floor(Math.random() * exits.length)];

            creep.memory.wanderlust .nextPortal = portal;
        } else {
            dlog('serious problem here')
        }
    }
}
