var util = require('common');
var _ = require('lodash');
var DEBUG_HARVEST = true;

function dlog(msg) {
    util.dlog('HARVEST', msg);
}

/// Utiilty functions
//
//
// Finds all stuff on the ground, returns object with resource types as keys
function freeEnergy(room){

    var sits = room.find(FIND_DROPPED_RESOURCES);
    var total ={};
    for (var dd in sits) {
        var clump = sits[dd];
        if (!util.def(total[clump.resourceType])){
            total[clump.resourceType]=0;
        }
        total[clump.resourceType]+=clump.amount;
    }
    return total;
}

module.exports.freeEnergy = freeEnergy;

Game.s = function() {
    for (var r in Game.rooms)
    {harvest.setupSources(Game.rooms[r]);}
}

// Optimize energy gathering by available roles in the room
module.exports.sortingHat = function(creep) {

    var taskList = creep.memory.taskList;

    var availPop = creep.room.memory.strategy.currentPopulation;

    // initialize these two for
    // testing later
    // find the miners in the room
    var assignments = {
        'shuttle' : 0,
        'miner' : 0,
        'workerBee' : 0
    };

    creep.room.find(FIND_MY_CREEPS).forEach(function(creeper, index, array) {
        var jerksCurTask = creeper.memory.taskList;

        if (!util.def(jerksCurTask)) {
            dlog('Brain dead creep!');
            return;
        }

        var curTask = jerksCurTask[jerksCurTask.length - 1];
        if (typeof assignments[curTask] === 'undefined') {
            assignments[curTask] = 0;
        }
        assignments[curTask]++;
    });

    //dlog('sorting ' + creep.name + ', role: ' + creep.memory.role)
    switch (creep.memory.role) {

        case 'gatherer': // default tasking for gatherer
            if (util.def(availPop.workerBee) && util.def(availPop.miner)) {
                if ((availPop.workerBee < availPop.miner)
                    && (availPop.workerBee > 0)) {
                    if (assignments.shuttle <= assignments.miner) {
                        creep.memory.taskList.push('shuttle')
                    } else {
                        creep.memory.taskList.push('gatherer')
                    }
                } else {
                    creep.memory.taskList.push('janitor')
                }
            } else {
                creep.memory.taskList.push('gatherer')
            }

            break;
        case 'workerBee': // default tasking for worker bee
            creep.memory.taskList.push('shuttle')
            break;
        default:
            creep.memory.taskList.push('gatherer')
    }

}

function findAlternateSource(creep) {

    var option = findSource(creep);

    while ( option ) {

        if (Game.getObjectById(option.srcId).energy >  300) {
            creep.memory.sTarget = option; return option;
        } 
    }
    return false;
}

function mine(creep) {

    // Two scenarios - mining by worker, and mining by miner

    if (!util.def(creep.memory.sTarget)) {
        // Will return a mineshaft object or false if none available
        var posting = findSource(creep);
        if (posting) {
            creep.memory.sTarget = posting;
        }
        else  {
            dlog(' no free mineshafts to assign for ' + creep.name );

            //Prooobably should come up with a better solution here
            //            creep.suicide();
            //creep.say('AAAH MOTHERLAND')
            // dlog('AAAAH MOTHERLAND')
            return false;
        }
    }
    var posting = creep.memory.sTarget;
    var srcObj = Game.getObjectById(posting.srcId);

    // No idea why this is needed. 
    posting.pos = new RoomPosition(posting.pos.x, posting.pos.y, posting.pos.roomName);

    if (creep.pos.isEqualTo(posting.pos)
        && ((creep.carry.energy < creep.carryCapacity) || (creep.carryCapacity == 0))) {
        var result = creep.harvest(srcObj);
        switch (result) {
            case OK: return true; break; 
            case ERR_NOT_ENOUGH_RESOURCES: 
                if (creep.memory.role != 'miner') {
                    creep.memory.sTarget = null;
                }
                else {
                    if (srcObj.ticksToRegeneration > 80) { // source overmined
                        posting.assignedTo='choke';
                       var alternate = findAlternateSource(creep);
                        if (!alternate) { // miners too efficient, need less
                            creep.say('AHHHHH MO')
                            creep.suicide(); 
                        }
                    }
                }
                return false;
                break;
            case ERR_TIRED: break;
            default: 
                dlog(' - ' + creep.name + ': Error trying to mine source ' + posting 
                    + ', ' + util.getError(result))
                return false
        }
    } else if (creep.carry.energy == 0) {
        var res = creep.moveTo(posting,{reusePath: 15, visualizePathStyle: {stroke: '#ff1100'}});
        if (!res ||  res == ERR_TIRED ) {
            return true;
        }
        dlog('mine error : ' + util.getError(res))  
    }
    return false
}

module.exports.mine = mine

function findContainer(creep) {
    var newTargets  = creep.room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_CONTAINER }
    });

    if (!util.def(newTargets) || newTargets.length == 0) {
dlog(' asdf here')
        return false // No containers in the room. Bail.
    } 

    var targets = [];

    for (var blob  in newTargets){
        var candidate = newTargets[blob];

        if (condidate.store == 0) { continue; }



        // var path = creep.pos.findPathTo(candidate, { ignoreCreeps: true});
        var path = creep.pos.findPathTo(candidate);
        if (!util.def(path) || path.length == 0 || creep.moveTo(candidate)) {
            continue;
        }

        var tScore = candidate.store[RESOURCE_ENERGY] / path.length;
        targets.push(
            { targetId: candidate.id,
                path: path,
                score: tScore
            });
    }


    if (!util.def(targets) || targets.length == 0) {
        dlog('no container targes')
        return false // No accessible energy in the room. Bail.
    }
    var hitList = targets.sort(function(a,b){
        if (a.score > b.score){return 1;}
            if (a.score < b.score){return -1;}
            return 0;
        }); // Get most sensible

    dlog('got container')
    return hitList[0].targetId;
}

module.exports.findContainer = findContainer;
function  shuttle(creep) {
    //Get energy from containers and move it to spawn


    if (!util.def(creep.memory.sinkId)
        || !util.def(Game.getObjectById(creep.memory.sinkId))) { // in case it's been destroyed
        creep.memory.sinkId = findSink(creep);
    }

    var mySink = Game.getObjectById(creep.memory.sinkId);

    if (!util.def(creep.memory.cTarget)){
        //??    var result = 
    }




    if (creep.pos.isNearTo(mySink) && (creep.carry.energy > 0)) {
        var result = creep.transfer(mySink, RESOURCE_ENERGY);
        if (!result) {return true}

        if (result == ERR_FULL) {
            // find new sink that's not full
            var newSink = findSink(creep);
            if (util.def(newSink)){
                creep.memory.sinkId = findSink(creep);
                return true;
            } else if (creep.getActiveBodyparts(WORK)){
                creep.memory.taskList.push('builder'); return false
            } else { //don't clog up spawn }h}
                while(creep.move(util.getRand(1,8))){}
                return;
            }
        }
    }
    if (creep.carry.energy == creep.carryCapacity) {
        var res = creep.moveTo(mySink, {reusePath: 15, visualizePathStyle: {stroke: '#22aa00'}});
        if (!res || (res == ERR_TIRED)) {
            return true
        } else {
            return false
        }
    }
    else {
       // Go scrounge for energy
        return scrounge(creep, 'collect');
    }
}

module.exports.shuttle= shuttle;

function findEnergy(creep) {

    var newTargets = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter: {resourceType: RESOURCE_ENERGY}});

        if (!util.def(newTargets) || newTargets.length == 0) {
            return false // No dropped energy in the room. Bail.
        } 
        
        var targets = [];
      var totalE = 0;  
        for (var blob  in newTargets){
            var candidate = newTargets[blob];
totalE += candidate.amount;
            // var path = creep.pos.findPathTo(candidate, { ignoreCreeps: true});
            var path = creep.pos.findPathTo(candidate);
            if (!util.def(path) || path.length == 0 || creep.moveTo(candidate)) {
                continue;
            }

            var tScore = candidate.amount / path.length;
            targets.push(
                { targetId: candidate.id,
                    path: path,
                    score: tScore
                });
        }

    if (totalE < 300) {
        if (creep.memory.taskList[creep.memory.taskList.length-1] != 'gatherer'){
            dlog('Energy crisis! Retasking to gatherer')
            creep.memory.taskList.push('gatherer');
        }
        }
        if (!util.def(targets) || targets.length == 0) {
            return false // No accessible energy in the room. Bail.
        }
        var hitList = targets.sort(function(a,b){
            if (a.score > b.score){return 1;}
            if (a.score < b.score){return -1;}
            return 0;
        }); // Get most sensible

    return hitList[0].targetId;
}
module.exports.findEnergy = findEnergy;
function scrounge(creep) {
    // TODO every 5 ticks or so we should check there is still something at the stored tile
    // Otherwise any time something is dropped you might pull a bunch of gatherers without need.
    // See if we are already on the move
    //
    //
    //        var nrg = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
    //        if (creep.pos.isNearTo(nrg)){
    //            creep.pickup(nrg);
    //        } else {
    //        creep.moveTo(nrg)}
    //    
    //    return 
    //    
    //
    if (!util.def(creep.memory.eTarget) || !util.def(Game.getObjectById(creep.memory.eTarget))) { // If I don't have a target, get one 
      var res = findEnergy(creep); 
        
        if (!util.def(res) || !res) {
           return false
        } 
        creep.memory.eTarget = res;
    }


    var target = Game.getObjectById(creep.memory.eTarget);
    //    util.dumpObject(target)
    if (!util.def(target)) {
    dlog('zomg')}
    var res = creep.pickup(target);



    // TODO: possibly reuse path found earlier for more efficiency
    switch(res){
        case OK: 
        case ERR_FULL:    
            return true; break;
        case ERR_NOT_IN_RANGE:
            var move = creep.moveTo(target, {reusePath: 15, visualizePathStyle: {stroke: 'fffaaf0'}});
            if (move == ERR_NO_PATH) { delete creep.memory.eTarget; return false; }
            return true; break;
        default: dlog("Error scrounging: " + util.getError(res) + ' ---- ' + res);
    }

    dlog('not quote sure how i got here but oh well')
    return false
}

module.exports.scrounge = scrounge;

function gatherer(creep) {

    // Priorities are:
    //  1. Pickup any free energy laying on the ground.
    //  2. Move energy from a container to extension/spawn if needed.
    //  3. Mine an energy source.
    //
    //
    // On the first day, he ate one apple
    // but he was still hungry

    if (creep.carry.energy == creep.carryCapacity) { creep.memory.taskState = 'SINK'}
    if (creep.carry.energy == 0 ) { creep.memory.taskState = 'SOURCE'}

    if (creep.memory.taskState == 'SOURCE') {

    // Each mode should set a target variable, and remove it when it fails
    // Check for these variables in reverse order of precedence

        //    if (creep.carry.energy < creep.carryCapacity) {
        if (util.def(creep.memory.cTarget)) {
            shuttle(creep);
        }
        
       
        if (util.def(creep.memory.eTarget)){
            scrounge(creep)
        }
        
        
        if (util.def(creep.memory.sTarget)){
            mine(creep);
        }

        if ( shuttle(creep) || scrounge(creep)|| mine(creep)){
            return true;
        } else {
            var coin = util.getRand(0,1);
            if (coin){ coin = 'technician';
            } else {
                coin = 'builder';
            }
            dlog('Retasking ' + creep.memory.role + ' to ' + coin)            
            creep.memory.taskList.push(coin);
        }
    }
    
   if (creep.memory.taskState == 'SINK') { 
     // That night he had a stomach ache
        var mySink = Game.getObjectById(creep.memory.sinkId);
       // util.dumpObject(mySink)

        if (!util.def(mySink) || isFull(mySink)) {
           var test = findSink(creep);
            if (!util.def(test)) {
                dlog('unable to acquire new sink.'); 
                
            var coin = util.getRand(0,1);
            if (coin){ coin = 'technician';
            } else {
                coin = 'builder';
            }
            dlog('Retasking ' + creep.memory.role + ' to ' + coin)            
            creep.memory.taskList.push(coin);
                
                
                return false;
            } else { mySink = Game.getObjectById(test);}
                //util.dumpObject(mySink)}
            // gatherer(creep);
        }
        var res = creep.transfer(mySink, RESOURCE_ENERGY);
        switch (res) {
            case OK: return true; break;
            case ERR_NOT_IN_RANGE: creep.moveTo(mySink, {reusePath: 15, visualizePathStyle: {stroke: '#ffaaff'}}); break;
            case ERR_FULL: delete creep.memory.sinkId; break;// gatherer(creep); break; 
            default: dlog('error sinking into ' + mySink.structureType + ': ' + util.getError(res));
        }
    }
}
function distance(p1, p2) {
    return Math.floor(Math.sqrt(Math.pow((p1.x - p2.x), 2)
        + Math.pow((p1.y - p2.y), 2)));
}

function findSink(creep) {
    var structs = creep.room.find(FIND_MY_STRUCTURES);

    //    dlog('Finding sink for ' + creep.name);

    var containersWithSpace = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType == STRUCTURE_CONTAINER &&
        i.store[RESOURCE_ENERGY] < i.storeCapacity[RESOURCE_ENERGY]});

    for (var x in containersWithSpace) {
        var object = containersWithSpace[x];
        object.distance = creep.pos.getRangeTo(object);
    }

    containersWithSpace.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        }
        if (a.distance < b.distance) {
            return -1;
        }
        return 0;
    });

    // Check pathing before we return 
    for (var y in containersWithSpace) {
        var target = containersWithSpace[y];
        var res = creep.moveTo(target, {reusePath: 15, visualizePathStyle: {stroke: '#ff1122'}});
        if (!res || res == ERR_TIRED) {return target;}

    }


    var distances = [];

    for ( var i in structs) {
        var struct = structs[i];
        var structid = struct.id;
        //dlog('is ' + struct.structureType + ' full? ' + isFull(struct))

        if ((struct.structureType == STRUCTURE_STORAGE) || (struct.structureType == STRUCTURE_EXTENSION)
            || (struct.structureType == 'spawn')) {

            // check there is a path
            if ((creep.moveTo(struct) != ERR_NO_PATH) && (!isFull(struct))) {
                // calculate distance
                //dlog('adding candidate')
                distances.push({
                    "structid" : structid,
                    "distance" : creep.pos.getRangeTo(struct),
                });
                // dlog('ID ' + structid + ' distance is '
                // + distances[structid].toFixed(3));

            }
        }
    }

    //dlog('found ' + distances.length)

    if (!distances.length) {
        //    dlog('seems all the nrg storage is full! I should build nore....');
        return
    }

    // Sort by distances

    distances.sort(function(a, b) {
        if (a.distance > b.distance) {
            return 1;
        }
        if (a.distance < b.distance) {
            return -1;
        }
        return 0;
    });

    // Use first not-full option
    for ( var candidate in distances) {
        if (distances[candidate].isFull) {
            continue;
        } else {
            return distances[candidate].structid;
        }
    }

    // if we are here, there are no non-full sinks. just move to the closest one
    // and wait
    return distances[0].structid;

    // TODO: Add storage logic
    // if ([ STRUCTURE_EXTENSION, 'storage' ].indexOf(struct.structureType)
    // == -1) {
    // continue;
    // }

    // All extensions and spawns are full. Hit up the controller then
    // for ( var i in structs) {
    // var struct = structs[i];
    // if ((struct.structureType == STRUCTURE_CONTROLLER)) {
    // return struct;
    // }
    // }
}
module.exports.gatherer = gatherer; 
function findOverhead(creep) { 
    if (creep.room.memory.nrgReserve) {
        return false
    }
    else { return false}
}
module.exports.findOverhead = findOverhead;
function findSource(creep) {

    if (!util.def(creep.room.memory.shafts)) {
        dlog('creep trying to find source in a room not setup!'); return false;
    } else {
        var shafts = creep.room.memory.shafts
    }

    if (creep.memory.role == 'miner'){
        for (var post in shafts) {
            if (!Game.creeps[shafts[post].assignedTo] || shafts[post].assignedTo == 'choke') {
                shafts[post].assignedTo = creep.name;
                return shafts[post];
            }
        }
    } else 
    {
        var randomShaft = 'mineshaft' + util.getRand(0,Object.keys(shafts).length);
        if (creep.pos.findPathTo(Game.getObjectById(shafts[randomShaft].srcId))){
        return shafts[randomShaft]}
    }
    // No open shafts
    return false;
}

function isFull(sink) {
    // console.log(sink.structureType + ": " + sink.energy +
    // "/"+sink.energyCapacity);
    if ((sink.structureType == STRUCTURE_EXTENSION)
        || (sink.structureType == STRUCTURE_SPAWN)) {
        // console.log(sink.structureType + ": " + sink.energy +
        // "/"+sink.energyCapacity);
        return sink.energy == sink.energyCapacity;
    } else if (sink.structureType == 'storage') {
        // console.log(sink.structureType + ": " + sink.store +
        // "/"+sink.storeCapacity);
        return sink.store == sink.storeCapacity;
    }
}
