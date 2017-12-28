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
        }

        // minions[dude].say(minions[dude].memory.role);
        performTask(minions[dude]);
    }
}

Creep.prototype.warmMap = function() {
    if (!util.def(this.room.memory.heatmap)) {
        return
    }
    if (this.memory.taskList[this.memory.taskList.length - 1] != 'builder') {
        // warm up the heat map
        var x = (this.pos.x < 1) ? 1 : (this.pos.x > 48) ? 48 :
            this.pos.x;
        var y = (this.pos.y < 1) ? 1 : (this.pos.y > 48) ? 48 :
            this.pos.y;
        this.room.memory.heatmap[x][y] += 9;
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
        dlog('Empty task list found: ' + creep.name);
       taskList[0] = somethingNeedDoing(creep);
        dlog('assinged ' + taskList[0] + ' to ' + creep.name);

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
        default:
            dlog('Unhandled creep task! (' + taskList[taskList.length - 1] + ')');
    }

    // dlog('jum result is ' + jobResult)

    //	dlog(creep.name + ' did ' + curJob + ' and his aim was ' + jobResult);
    if (!jobResult) {
        dlog('job popped')
        creep.memory.taskList.pop();
    }
}
module.exports.performTask = performTask;

var getDefaultTask = function(creep) { // What to do if the creep has
        // nothing to do

        var role = Memory.creeps[creep.name].role; // Access memory like this in
        // case creep is still spawning.

        if (!util.def(role)) {
            role = 'worker'
        }
        dlog('found a ' + creep.memory.role + ' needing a job')



        // dlog('assigning default task');
        switch (role) {
            case 'worker':
                //                return somethingNeedDoing(creep);
                return 'gatherer';
                break;
            case 'miner':
                return 'miner'
            case 'soldier':
            case 'medic':
                // case 'scout':
                // case 'pfc':
                // case 'footSoldier':
                // case 'cavalry':
                // case 'enforcer':
                return 'military';
            default:
                console.log('unmatched unit found!');
                return 'gatherer';
        }
    }
    // TODO - make the weights used below dynamic

function somethingNeedDoing(creep) {

    // Some tasks are role bound by bodyparts
    if (creep.memory.role == 'miner') {
        return 'miner'
    };
    if (creep.memory.role == 'soldier') {
        return 'soldier	'
    };

    if (creep.getActiveBodyparts(CARRY)> 0 && creep.carry == 0) {
        harvest.fillTank(creep);
    }

    switch (creep.memory.role) {
        case 'worker':
            var result = Math.floor((Math.random() * 10));
            if (result < 2) {
                return 'gatherer'
            } else if (result < 5) {
                return 'technician'
            } else if (result<8) {
                return 'builder'
            } else {
                return 'scout'
            }
    }
}

function dlog(msg) {
    util.dlog('TASKER', msg);
}
