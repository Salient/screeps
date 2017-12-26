var util = require('common');

module.exports.disperse = function(creep) {
    if (!util.def(creep.memory.wanderlust)) {
        creep.memory.wanderlust = {};
    }
    
    creep.say('🔱 ')

	if (creep.carry.energy != creep.carryCapacity) {
		creep.memory.taskState = 'SINK'
		// TEMP CODE vvv
		// creep.memory.taskList.pop();
	}

	if (creep.carry.energy == 0) {
		creep.memory.taskState = 'SOURCE'
		// fillTank(creep);
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
