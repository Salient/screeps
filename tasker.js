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
            // warm up the heat map
            var x = (creep.pos.x < 1) ? 1 : (creep.pos.x > 48) ? 48 :
                creep.pos.x;
            var y = (creep.pos.y < 1) ? 1 : (creep.pos.y > 48) ? 48 :
                creep.pos.y;
            room.memory.heatmap[x][y] += 5;

            //            if (creep.taskState = 'RETURNING' || creep.taskState == 'LEAVING') {
            var test = Game.getObjectById(creep.memory.eTarget);
            if (!test){
            test = Game.getObjectById(creep.memory.sinkId);
            }
            if (util.def(test) && test.room.name != creep.room.name) {
                dlog('boosting')
                room.memory.heatmap[x][y] += 50; // interroom paths are traveled less often but just as important
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

Creep.prototype.warmMap = function() {
    if (!util.def(this.room.memory.heatmap) || !util.def(this.memory.taskList)) {
        return
    }

    if (this.memory.taskList.length > 0 && this.memory.taskList[this.memory.taskList.length - 1] != 'builder') {
        // warm up the heat map
        var x = (this.pos.x < 1) ? 1 : (this.pos.x > 48) ? 48 :
            this.pos.x;
        var y = (this.pos.y < 1) ? 1 : (this.pos.y > 48) ? 48 :
            this.pos.y;
        this.room.memory.heatmap[x][y] += 9;
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

    creep.warmMap();
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
        taskList.push(getDefaultTask(creep));

        //dlog('assinged ' + taskList[0] + ' to ' + creep.name);

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
        case 'scout':
            jobResult = spore.disperse(creep);
            break;
        case 'filltank':
            jobResult = harvest.fillTank(creep);
            break;
        case 'leaveroom':
            creep.leaveRoom();
            break;
        case 'busywork':
            creep.memory.taskList.pop();
            var busywork = somethingNeedDoing(creep);
            creep.memory.taskList.push(busywork);
            // dlog('Assigning ' + creep.name + ' busy work...(' + busywork + ')');
            jobResult = true;
            break;
        default:
            dlog('Unhandled creep task! (' + taskList[taskList.length - 1] + ')');
    }

    // dlog('jum result is ' + jobResult)

    //	dlog(creep.name + ' did ' + curJob + ' and his aim was ' + jobResult);
    if (!jobResult) {
        //        if (creep.memory.taskList.length > 1) {
        // dlog(creep.name + " popped job, was: " + creep.memory.taskList[creep.memory.taskList.length - 1] + ', task queue length: ' + creep.memory.taskList.length);
        creep.memory.taskList.pop();
        // }
    }
}
module.exports.performTask = performTask;

var getDefaultTask = function(creep) { // What to do if the creep has
    // nothing to do

    var role = Memory.creeps[creep.name].role; // Access memory like this in
    // case creep is still spawning.

    if (!util.def(role)) {
        dlog('some serious shisnit here')
        role = 'worker'
    }
    // dlog('found a ' + creep.memory.role + ' needing a job')



    // dlog('assigning default task');
    switch (role) {
        case 'worker':
        case 'scout':
        case 'miner':
            return role;
            break;
        case 'soldier':
        case 'medic':
            return 'military';
            break;
        default:
            console.log('unmatched unit found!');
            return role;
    }
}


// TODO - make the weights used below dynamic

function somethingNeedDoing(creep) {

    var role = creep.memory.role;

    switch (role) {
        case 'worker':
            var result = Math.floor((Math.random() * 10));
            if (result < 5) {
                return 'gatherer'
            } else if (result < 8) {
                return 'builder'
            } else if (result <= 9) {
                return 'technician'
            } else {
                //                return 'scout'
            }
            break;

        default:
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
