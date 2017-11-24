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

        if ((creep.pos.isNearTo(target)) && (creep.carry.energy > 0)) {
            creep.say(sayProgress(target) + '%');
            creep.build(target)
            return true;

        } else if (creep.carry.energy == creep.carryCapacity) {
            var res = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
            return true;

        } else {
            fillTank(creep);
            return true;

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


    //    constructionSites
    //        .sort(function(a, b) {
    //
    //            if (buildPriority[a.structureType] < buildPriority[b.structureType]) {
    //                return -1
    //
    //            } else if (buildPriority[a.structureType] > buildPriority[b.structureType]) {
    //                return 1;
    //            } else {
    //                return 0
    //            }
    //        })
    //
    //    dlog('Priority list')
    //    for (var x = 0; x < constructionSites.length; x++) {
    //        dlog(constructionSites[x].structureType);
    //    }
    //    constructionSites.reverse()
    //    dlog('flip round and revese it')
    //   for (var x = 0; x < constructionSites.length; x++) {
    //        dlog(constructionSites[x].id)
    //    }

    // Check if path exists!! Otherwise, builders can block each other
    var res = creep.build(bTarget);
    if (res == ERR_NOT_IN_RANGE){
        var path = creep.moveTo(bTarget, {reusePath: 15, visualizePathStyle: {stroke: '1ffaa00'}});
        if (path && path != ERR_TIRED){
            dlog('build error : ' + util.getError(path)); return false;
        }
    }

    dlog('shouldnt be here') 
    return null
    //	
    // var structures = creep.room.find(FIND_STRUCTURES);
    // var options = [];
    //
    // for ( var i in structures) {
    // var s = structures[i];
    //
    // // Check if path exists!! Otherwise, builders can block each other
    // var path = creep.moveTo(s);
    // if (path) {
    // continue; // Can't do it for some reason.
    // }
    // if (s) {
    // if (s.hits === null) {
    // continue;
    // } else if (needsRepair(s)) {
    // if (s.structureType === STRUCTURE_RAMPART) {
    // if (target !== null
    // && (target.structureType == STRUCTURE_RAMPART)
    // && (target.hits < s.hits)) {
    // continue;
    // }
    // target = s;
    // }
    // if ((s.structureType == STRUCTURE_ROAD)
    // && (target === null || (target.structureType != STRUCTURE_RAMPART))) {
    // target = s;
    // }
    // if (target === null
    // || ((s.structureType == STRUCTURE_WALL) && (target === null || ([
    // STRUCTURE_RAMPART, STRUCTURE_ROAD ]
    // .indexOf(target.structureType) == -1)))) {
    // target = s;
    // }
    // }
    // }
    // }
    //
    // if (target === null && site !== null) {
    // return site.id;
    // } else if (target !== null && (target.hits < (target.hitsMax / 4))) {
    // return target.id;
    // } else if (site !== null) {
    // return site.id;
    // } else if (target !== null) {
    // return target.id;
    // }
    // // console.log('failed to find target');
    // return null;
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

    if (!creep.getActiveBodyparts(CARRY)) {return false}
    if (creep.carry == creep.carryCapacity) {return true}

    if (!util.def(creep.memory.eTarget) || !util.def(Game.getObjectById(creep.memory.eTarget))){
        
        var structs = creep.room.find(FIND_MY_STRUCTURES);
        creep.say('Filling up my tank');

        var takePriority = ['container','storage','extension','spawn'];

        // Prioritize
        for (var need in takePriority) {
            var priority = takePriority[need];
            for (var site in structs) {
                if ((structs[site].structureType == priority) && (!util.def(structs[site].nrgReserve))) {
                    if( structs[site].energy > 0) {
                    
                    var res = creep.moveTo(structs[site], {reusePath: 5, visualizePathStyle: {stroke: '1ffaa77'}});
                        
                        if (!res){
                            creep.memory.eTarget = structs[site].id; 
                            return;
                        }
                    }
                }
            }
        }
    }
    if (!util.def(creep.memory.eTarget) || !util.def(Game.getObjectById(creep.memory.eTarget))){
        dlog('builders need energy to build, but none stored available');
        harvest.scrounge(creep)
        return false;
    }

    var sugarDaddy = Game.getObjectById(creep.memory.eTarget);
    
      var res = creep.withdraw(sugarDaddy, "energy"); 
    if (res == ERR_NOT_IN_RANGE) {
         var path = creep.moveTo(sugarDaddy, {reusePath: 5, visualizePathStyle: {stroke: '1ffaa00'}});
        if (path != OK && path != ERR_TIRED) {
            dlog('error moving to nrg source: ' + util.getError(path))
               harvest.scrounge(creep)
        }
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
