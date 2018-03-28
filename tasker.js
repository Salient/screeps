var util = require('common');
var spore = require('spores');
var harvest = require('harvester');
var build = require('builder');
var military = require('tactics');

var debug = true; // Debug code

module.exports.taskMinions = function(room) {
    var minions = room.find(FIND_MY_CREEPS);

    for (var dude in minions) {
        var creep = minions[dude];

        if (room.memory.planned &&
            creep.memory.taskList[creep.memory.taskList.length - 1] != 'builder') {

            //            if (creep.taskState = 'RETURNING' || creep.taskState == 'LEAVING') {
            var test = Game.getObjectById(creep.memory.eTarget);
            if (!test) {
                test = Game.getObjectById(creep.memory.sinkId);
            }
            if (util.def(test) && test.room.name != creep.room.name) {
                dlog('boosting')
                    //         room.memory.heatmap[x][y] += 50; // interroom paths are traveled less often but just as important
            }

            // minions[dude].say(minions[dude].memory.role);
            performTask(minions[dude]);
        }
    }
}

//if (!util.def(this.memory) || this.memory == {}) {
//    dlog('CREEP ' + this.name + ' HAS AMNESIA');
//    this.memory = {
//        role: 'worker',
//        birthRoom: this.room,
//        taskList: ['gatherer'],
//        taskState: 'SOURCE'
//    }
//}

Creep.prototype.updateTraffic = function(boost) {
    if (!util.def(this.room.memory.trafficMap)) {
        this.room.memory.trafficMap = {};
    }

    if (!util.def(this.memory.taskList)) {
        dlog('???')
        return
    }

    var map = this.room.memory.trafficMap;


    var myX = this.pos.x;
    var myY = this.pos.y;

    if (!util.def(map[myX])) {
        map[myX] = {};
    }



    if (!util.def(map[myX][myY])) {
        map[myX][myY] = {
            heat: 0,
            refreshed: 0
        }
    }

    var thisSpot = map[myX][myY];
    if (this.memory.taskList.length > 0) {

        thisSpot.heat = thisSpot.heat - (Game.time - thisSpot.refreshed); // decrement value 1 per tick since last updated
        if (thisSpot.heat < 0) {
            thisSpot.heat = 15
        } else {
            if (this.currentTask == 'builder') {
                thisSpot.heat = thisSpot.heat + 5;
            } else {
                thisSpot.heat = thisSpot.heat + 15;
            }
        }
        if (util.def(boost)) {
            thisSpot.heat = thisSpot.heat + boost;
        }
        thisSpot.refreshed = Game.time;
        this.room.memory.lastUsed = Game.time;
    }
}

Object.defineProperty(Creep.prototype, "taskState", {
    get() {
        return this.memory.taskState;
    },
    set(x) {
        this.memory.taskState = x;
    }
});

Object.defineProperty(Creep.prototype, "currentTask", {
    get() {
        if (this.memory.taskList) {
            return this.memory.taskList[this.memory.taskList.length - 1];
        }
    }
});

Object.defineProperty(Creep.prototype, "role", {
    get() {
        return this.memory.role;
    }
});

Creep.prototype.changeTask = function(newtask) {
    if (util.def(this.memory.taskList) && this.memory.taskList.length > 0) {
        this.memory.taskList.pop();
        this.memory.taskList.push(newtask);
    } else {
        this.memory.taskList = [newtask];
    }
}
Creep.prototype.addTask = function(newtask) {
    if (util.def(this.memory.taskList)) {
        this.memory.taskList.push(newtask);
    }
}

var performTask = function(creep) {

    if (creep.spawning) {
        return;
    }

    if (!util.def(creep.memory.birthRoom)) {
        creep.memory.birthRoom = Memory.homeworld;
        creep.log('corruption')
    }
    creep.updateTraffic();
    // Two types of tasks: default role task, and special assigned tasks
    // role tasks are search and perform logic, assigned are specific targets
    // to prevent multiple units trying to work on the same thing

    var taskList = creep.memory.taskList;

    if (!util.def(taskList)) {
        // dlog('Undefined task list found: ' + creep.name);
        creep.memory.taskList = [];
    }

    if (taskList.length == 0) {
        // Add default task, and then busy work
        //        dlog('Empty task list found: ' + creep.name);
        taskList.push(somethingNeedDoing(creep));
        //         taskList.push(getDefaultTask(creep));

        //dlog('assinged ' + taskList[0] + ' to ' + creep.name);

        // creep.log('New job');
    }
    // if ((taskList.length > 1) && !(Game.time % 10)) // Periodically refresh
    // // temporary tasksf
    // {
    // // dlog('refreshing the task list for ' + creep.name);
    // taskList.pop();
    // }
    var curJob = taskList[taskList.length - 1]
    var jobResult;
    // Global behavior definitions
    switch (curJob) {
        case 'miner':
            jobResult = harvest.mine(creep);
            break;
        case 'shuttle':
            jobResult = harvest.shuttle(creep);
            break;
        case 'gatherer':
        case 'worker':
            jobResult = harvest.gatherer(creep);
            break;
        case 'military':
            jobResult = military.duty(creep);
            break;
        case 'technician':
            jobResult = build.upgradeRC(creep);
            break;
        case 'builder':
            jobResult = build.builder(creep);
            break;
        case 'damageControl':
            jobResult = build.repair(creep);
            break;
        case 'seedling':
            //    creep.log('immaseedling')
            //jobResult = spore.disperse(creep);
            jobResult = spore.infest(creep);
            break;
        case 'scout':
            //creep.log('immascout')
            //jobResult = spore.disperse(creep);
            jobResult = spore.infest(creep);
            break;
        case 'filltank':
            jobResult = harvest.fillTank(creep);
            break;
        case 'leaveroom':
            creep.updateTraffic(50);
            jobResult = creep.leaveRoom();
            break;
        case 'explore':
            jobResult = creep.exploreNewRoom();
            break;
        case 'busywork':
            creep.memory.taskList.pop();
            var busywork = somethingNeedDoing(creep);
            creep.memory.taskList.push(busywork);
            // dlog('Assigning ' + creep.name + ' busy work...(' + busywork + ')');
            jobResult = true;
            break;
        default:
            creep.log('Unhandled creep task! (' + taskList[taskList.length - 1] + ')');
    }

    // dlog('jum result is ' + jobResult)

    //	dlog(creep.name + ' did ' + curJob + ' and his aim was ' + jobResult);
    if (!jobResult) {
        // dlog('type: ' + typeof jobResult)
        var count = creep.memory.taskSpinCount;
        if (!util.def(count)) {
            creep.memory.taskSpinCount = 1;
        } else {
            count = count + 1;

            if (count > 5) {
                creep.log('spinning my wheels here');
            }
        }

        if (creep.memory.taskList.length > 10) {
            dlog(creep.name + " popped job, was: " + creep.memory.taskList[creep.memory.taskList.length - 1] + ', task queue length: ' + creep.memory.taskList.length);
        }
        creep.memory.taskList.pop();
    }
}
module.exports.performTask = performTask;

//var getDefaultTask = function(creep) { // What to do if the creep has
//    // nothing to do
//
//    var role = Memory.creeps[creep.name].role; // Access memory like this in
//    // case creep is still spawning.
//
//    if (!util.def(role)) {
//        dlog(creep.name + ' some serious shisnit here')
//        role = 'worker'
//    }
//    // dlog('found a ' + creep.memory.role + ' needing a job')
//
//
//
//    // dlog('assigning default task');
//    switch (role) {
//        case 'worker':
//        case 'seedling':
//        case 'miner':
//            return role;
//            break;
//        case 'soldier':
//        case 'medic':
//            return 'military';
//            break;
//        default:
//            console.log('unmatched unit found!');
//            return role;
//    }
//}


// TODO - make the weights used below dynamic

function somethingNeedDoing(creep) {

    var role = creep.memory.role;
    if (!util.def(role)) {
        creep.log('i have amnesia!');
        creep.memory.role = 'worker';
    }
    switch (role) {
        case 'scout':
        case 'miner':
        case 'seedling':
            return role;
            break;
        case 'worker':
            // var result = (creep.room.energyCapacity / creep.room.energyCapacityAvailable) < 0.75 ? 1 :  Math.floor((Math.random() * 10));
            // Force gather if there is not at least 3/4 capacity energy in the room
            if ((creep.room.energyAvailable / creep.room.energyCapacityAvailable) < 0.75) {
                //creep.log('low energy in this room. gathering');
                return 'gatherer';
            }

            // Weight priorities
            //
            //
            var gatherWeight = 5 * Math.floor((Math.random() * 10));
            var buildWeight = creep.room.memory.cache.construction.active * Math.floor((Math.random() * 10));
            var techWeight = 3 * Math.floor((Math.random() * 10));

            // creep.log('choosing new job. gather: ' + gatherWeight + ', builder: ' + buildWeight + ', tech: ' + techWeight )
            //creep.log('i guess there is energy in this room. result is ' + result);
            //creep.log('energy capacity is ' + creep.room.energyAvailable+ ', available is ' + creep.room.energyCapacityAvailable);
            var winner = Math.max(gatherWeight, buildWeight, techWeight);

            if (winner == gatherWeight) {
                return 'gatherer';
            } else if (winner == buildWeight) {
                return 'builder';
            } else {
                return 'technician';
            }
            break;

        default:
            dlog('do not have a default case for role ' + role);
            return role;
    }
}

function colonyOverseer(creep) {

    // So far main worker functions are gatherer, builder, and tech
    var strats = creep.room.memory.strategy;
    if (!util.def(strats)) {
        return somethingNeedDoing(creep);
    }

    if (util.def(creep.room.storage)) {
        var nrgReserves = creep.room.storage.store[RESOURCE_ENERGY];
    } else {
        nrgReserves = false
    }

    // Want to keep some basic level of emergency energy
    if (nrgReserves < 10000 * creep.room.controller.level) {
        return 'gatherer';
    }

    //    if (roo)


}

function dlog(msg) {
    util.dlog('TASKER', msg);
}
