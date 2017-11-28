var util = require('common');
var harvest = require('harvester'); // useful for energy finding routines

Structure.prototype.needsWorkers = function() {
    var attendees = this.memory.workers;
    var maxAttendees = this.memory.maxWorkers;

    if (typeof attendees === 'undefined') {
        attendees = 0;
    }

    if (typeof maxAttendees === 'undefined') {
        maxAttendees = 1; // If not defined, be conservative to prevent log
        // jams
    }
    var count = 0;
    attendees.sort();
    for ( var creep in attendees) {
        if (attendees[creep].hits > 0) {
            count++;
        } else {
            destroy(attendees[creep]);
        }
    }
}

Structure.prototype.needsRepair = function() {
    return this.hits < this.hitsMax * .8;
};

Structure.prototype.isDone = function() {
    return (this.hits == this.hitsMax);
};

var buildExtension = function(creep) {

    var numExts = 0;
    var structs = creep.room.find(FIND_MY_STRUCTURES);
    structs.forEach(function(s) {
        if (structs[s].structureType == 'STRUCTURE_EXTESION') {
            numExts++;
        }
    });

    var maxExts = creep.room.memory.maxExts;
    if (typeof maxExts !== 'undefined') {
        if (numExts < maxExts) {

            // build ext.
        }
    }
}

function dlog(msg) {
    util.dlog('CONSTRUCTION', msg);
}

module.exports = function(creep) {
    // Take a look around the room for something to do

    // If we are here, seems there is no extension with energy
    // workerBee(creep);
    // return;

    var targetId = creep.memory.myTargetId
    if (!util.def(targetId) || !util.def(Game.getObjectById(targetId))) {
        var orders = constructionDuty(creep) || repairDuty(creep);
        if (!util.def(orders) || orders == false ) {
            dlog(creep.name + ' says nothing to build or repair, reverting to prior task')
            creep.memory.taskList.pop();
            return false;
        } else 

        {creep.memory.myTargetId = orders;}
    }

    var target = Game.getObjectById(creep.memory.myTargetId);
    if (!util.def(target) ){
        creep.memory.myTargetId = null; return false;
    }
    // check if done
    if (util.def(target.hits) && (target.hits == target.hitsMax)) {
        targetId = null
        creep.say('Done!')
        return true;
    }

    if (target.progress >= 0) {

        var res = creep.build(target);
        switch (res) {
            case OK:  
                creep.say(sayProgress(target) + '%');
                break;
            case ERR_NOT_IN_RANGE: 
                creep.moveTo(target, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
                break;
            case ERR_NOT_ENOUGH_RESOURCES: 
                fillTank(creep);
                break;
            default: dlog('Build command error: ' + util.getError(res));
        }

    } else if (needsRepair(target)) {

        if ((creep.pos.isNearTo(target)) && (creep.carry.energy > 0)) {
            creep.say(sayProgress(target) + '%');
            creep.repair(target)
            return true;

        } else if (creep.carry.energy == creep.carryCapacity) {
            var res = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
            return true;

        } else {
            fillTank(creep);
            return true;

        }

    } else {
        // console.log('clearing target ' + creep.name + ' target: '
        // + target.structureType + ' ' + target.hits + '/'
        // + target.hitsMax);
        dlog('builder unsure what to do with target ' + target.id)
    }
}

function needsRepair(target) {
    // console.log('needs repair? ' + target.hits + '/' + target.hitsMax);
    return target.hits < (target.hitsMax / 2);
}

function repairDuty(creep) {
    return false;
    var structures = creep.room.find(FIND_MY_STRUCTURES);
    var options = [];

    // TODO: can I sort structures in order of damage?
    for ( var i in structures) {
        var s = structures[i];

        var intendedPath = creep.checkPath(s);
        // Check if path exists!! Otherwise, builders can block each other

        if (s.hits === null) {
            continue;
        }

        if (s.needsRepair()) {
            var res = creep.moveTo(s, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
            creep.repair(s);
        }
    }
}

function constructionDuty(creep) {

    if ( creep.getActiveBodyparts(WORK) == 0) {
        creep.memory.taskList.pop(); return false;
    }

    if (!util.def(creep.memory.bTarget) || !util.def( Game.getObjectById(creep.memory.bTarget) )) {
        // If not listed then it's built by nearest after all these are done
        var buildPriority = ['extension','container','storage','spawn','link','rampart','road','constructedWall'];

        var newTarget  = creep.room.find(FIND_MY_CONSTRUCTION_SITES); 

        if (!util.def(newTarget)){
            dlog('no build targets. untasking')
            //   creep.memory.taskList.pop();
            return false;
        }

        // Prioritize
        for (var need in buildPriority) {
            var priority = buildPriority[need];
            for (var site in newTarget) {
                if (newTarget[site].structureType == priority){

                    creep.memory.bTarget = newTarget[site].id; 
                    dlog('assinging ' + creep.name + ' build target ' + priority);
                    return newTarget[site].id; 
                }
            }
        }
    } 

    if (util.def(creep.memory.bTarget) && util.def( Game.getObjectById(creep.memory.bTarget) )) {
        creep.memory.bTarget = newTarget[0].id; 
        return newTarget[0].id;
    }

    var bTarget = Game.getObjectById(creep.memory.bTarget);

    dlog(creep.name + ' on construction duty')

    return bTarget;

}

module.exports.constructionDuty = constructionDuty;
module.exports.upgradeRC = upgradeRC;

function upgradeRC(creep) {
    var rc = creep.room.controller;
    if (creep.getActiveBodyparts(WORK) == 0) {
        creep.memory.taskList.pop(); return false;
    }
    if (creep.pos.isNearTo(rc) && (creep.carry.energy > 0)) {
        creep.say(sayProgress(rc) + "%");
        creep.upgradeController(rc);
    } else if (creep.carry.energy == creep.carryCapacity) {
        var path = creep.moveTo(rc, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
        if (path) {
            if (path != ERR_TIRED) {
                dlog('Tech path error: ' + util.getError(path))
                // Must be busy with other techs. Go build something instead.
                creep.memory.taskList.push('builder')
                return false
            }
        }
    } else {
        fillTank(creep);
    }

}

function fillTank(creep) {
    creep.say('F')
    if (!creep.getActiveBodyparts(CARRY)) {return false}
    if (creep.carry == creep.carryCapacity) {return true}


    var nrg = harvest.findContainer(creep);
    if (!nrg) {
        nrg = harvest.findEnergy(creep);
        if (!nrg) {
           nrg = harvest.findOverhead(creep);
            if (!nfg) {
        dlog('builders need energy to build, but none stored available. reverting tasks');
        creep.memory.taskList.pop();
        return false;
        }
        }        
    }

    var gas = Game.getObjectById(nrg);
    util.dumpObject(gas)
    if (!util.def(gas)) {dlog('dunno')}

    if (util.def(gas.energy)){
        dlog('picking up energy')
        var res = creep.pickup(gas);
    } else if (util.def(gas.store)) {
        dlog('picking up container')
        var res = creep.withdraw(gas, RESOURCE_ENERGY);
    }


    switch (res) {
        case OK: return true; break;
        case ERR_NOT_IN_RANGE: 
            var path = creep.moveTo(sugarDaddy, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
            if (path != OK && path != ERR_TIRED) {
                dlog('error moving to nrg source: ' + util.getError(path))
                harvest.scrounge(creep)
            }
            break;
        case ERR_NOT_ENOUGH_RESOURCES: creep.memory.wTarget=null;  break;
        default: dlog('filling tank but ' + util.getError(res))
    }
    return;

    if (!util.def(creep.memory.wTarget) || !util.def(Game.getObjectById(creep.memory.wTarget)) || Game.getObjectById(creep.memory.wTarget).energy < 50){

        var structs = creep.room.find(FIND_MY_STRUCTURES);
        var takePriority = ['container','storage','extension','spawn'];
        creep.memory.wTarget = null;
        // Prioritize
        dance:
        for (var need in takePriority) {
            var priority = takePriority[need];
            dlog('looking for energy in ' + priority)
            for (var site in structs) {
                if (structs[site].structureType == priority) {
                    if ((((priority == 'container') || (priority == 'storage')) && (structs[site].store >=50)) || 
                        (((priority == 'extension') || (priority == 'spawn')) && (structs[site].energy >=50)))  {
                        dlog('passed sniff test')
                        var res = creep.moveTo(structs[site], {reusePath: 5, visualizePathStyle: {stroke: '1ffaa77'}});
                        if (!res){
                            creep.memory.wTarget = structs[site].id; 
                            dlog('selected ' + structs[site].structureType)
                            break dance;
                        } else {dlog('passed ' + util.getError(res))}
                    } else {dlog('sniff failed for ' + priority)}
                }
            }
        }
    }

    if (!util.def(creep.memory.wTarget) || !util.def(Game.getObjectById(creep.memory.wTarget))){
        dlog('builders need energy to build, but none stored available. reverting tasks');
        creep.memory.taskList.pop();
        return false;
    }

    var sugarDaddy = Game.getObjectById(creep.memory.wTarget);
    var space = (creep.carryCapacity - creep.carry.energy);

    var res = creep.withdraw(sugarDaddy, "energy", space< 50 ? space : 50) ; 
    switch (res) {
        case OK: return true; break;
        case ERR_NOT_IN_RANGE: 
            var path = creep.moveTo(sugarDaddy, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
            if (path != OK && path != ERR_TIRED) {
                dlog('error moving to nrg source: ' + util.getError(path))
                harvest.scrounge(creep)
            }
            break;
        case ERR_NOT_ENOUGH_RESOURCES: creep.memory.wTarget=null;  break;
        default: dlog('filling tank but ' + util.getError(res))
    }
}

function sayProgress(target) {

    if (util.def(target.progress)) {
        return parseInt((target.progress / target.progressTotal) * 100);
    } else if (target.hits !== null) {
        return parseInt((target.hits / target.hitsMax) * 100);
    } else {
        dlog('say what?')
    }
}
