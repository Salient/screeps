var util = require('common');

var DEBUG_HARVEST = true;

function dlog(msg) {
    util.dlog('HARVEST', msg);
}


////////////////////////////////////////////////////////////////////////
////// Begin Next Gen Code
////////////////////////////////////////////////////////////////////////

module.exports.pokeMiners = function(room){
    if (!util.def(room.memory.shafts)){
        dlog('refreshing shaft assignments in ' + room.name + ' but no shaft memory')
        return false;
    }
    var shafts = room.memory.shafts;
    for(var post in shafts) {
        if(!Game.creeps[shafts[post].assignedTo]) {
            shafts[post].assignedTo = null;
        }
    }
}
////////////////////////////////////////////////////////////////////////
////// End Next Gen Code
////////////////////////////////////////////////////////////////////////



function harvestArbiter(creep) {

    var sources = creep.room.memory.sources;
    var paths = creep.room.memory.paths;

    if (!util.def(sources) || !util.def(paths) || (paths.length == 0)) {
        dlog('Someone is lpoking for a source, but i don\'t know crap about this room')
        return; // Wait for room survey and design
    }

    for ( var src in sources) {
        var thisSrc = sources[src]

        if (!util.def(thisSrc.attendees)) {
            thisSrc.attendees = [];
        } else {

        }
    }

}

function refreshArbiters(room) {

    // Check each creep that has been assigned to a source and check they
    // are
    // still alive and kicking
    // Actual assignment and balancing is done in the assignSource function

    // Evaluate source assignments
    var sources = room.memory.sources;

    if (!util.def(sources)) {
        return // Wait for a room survey to be done
    }

    for ( var src in sources) {
        var thisSrc = sources[src]

        if (!util.def(thisSrc.attendees)) {
            thisSrc.attendees = []; // Should be a list of creep id's
        } else {

            for ( var slave in thisSrc.attendees) {

                var attenId = thisSrc.attendees[slave]; //

                var attendee = Game.getObjectById(attenId)

                if (util.def(attendee) && (attendee.myTargetId == thisSrc.id)) {
                    // Check creep is still alive and working on this source
                    // okay
                    continue;
                } else {
                    dlog('Removing ' + thisSrc.id + ' from creeps assigned to '
                        + thisSrc.id)
                    thisSrc.attendees.splice(slave, 1)
                    // stale id, remove it from the list of id's assigned to
                    // this source
                }
            }
        }
    }

    // Evaluate dropped energy assignments

}

module.exports.refreshArbiters = refreshArbiters;

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

function mine(creep) {
    if (!util.def(creep.memory.srcPost)) {

        // Will return a mineshaft object or null
        var posting = findSource(creep);

        if (util.def(posting)) {
            creep.memory.srcPost = posting;
        } else { dlog('Error, could not assign new source to ' + creep.name);
        }
    }

    var post = creep.memory.srcPost;
    var srcObj = Game.getObjectById(post.srcId);

    if (creep.pos.isNearTo(srcObj)
        && ((creep.carry.energy < creep.carryCapacity) || (creep.carryCapacity == 0))) {
        var result = creep.harvest(srcObj);

        if (!result) {
            return true
        }

        if ((result == ERR_NOT_ENOUGH_ENERGY)) {
            // over mined this source
            dlog(creep.name + ' source is over mined?/')
            return false
        }

        if ((result != ERR_TIRED)) {
            dlog(' - ' + creep.name + ': Error trying to mine source ' + post 
                + ', ' + util.getError(result))
            return false
        } else {
            return true
        }
    } else if (creep.carry.energy == 0) {
        var res = creep.moveTo(post.pos.x, post.pos.y, {reusePath: 5, visualizePathStyle: {stroke: '#ffaa00'}});
        if (!res ||  res == ERR_TIRED ) {
            return true;
        } 
    }
    return false
}

module.exports.mine = mine

module.exports.shuttle = function(creep) {

    if (!util.def(creep.memory.sinkId)
        || !util.def(Game.getObjectById(creep.memory.sinkId))) {
        creep.memory.sinkId = findSink(creep);
    }

    var mySink = Game.getObjectById(creep.memory.sinkId);

    if (creep.pos.isNearTo(mySink) && (creep.carry.energy > 0)) {
        var result = creep.transfer(mySink, RESOURCE_ENERGY);
        if (!result) {return true}

        if (result == ERR_FULL) {
            // find new sink that's not full
            creep.memory.sinkId = findSink(creep);
        }
    }
    if (creep.carry.energy == creep.carryCapacity) {

        var res = creep.moveTo(mySink, {reusePath: 5, visualizePathStyle: {stroke: '#ffaa00'}});
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

function scrounge(creep, mode) {
    // TODO every 5 ticks or so we should check there is still something at the stored tile
    // Otherwise any time something is dropped you might pull a bunch of gatherers without need.
    // See if we are already on the move
    //
    //
    if (util.def(creep.memory.eTarget)) {
        var nrg =  creep.memory.eTarget; 
        if( creep.pos.isNearTo(nrg)) {
            var res = creep.pickup(nrg);
            if (!res) {
                return true
            } else {
                dlog('Error scroundng for NRG, creep ' + creep.name + ','
                    + util.getError(res));
                delete creep.memory.eTarget;
                return false;
            }
        } else {
            var path = creep.moveTo(nrg, {reusePath: 5, visualizePathStyle: {stroke: 'fffaaf0'}});
            return true;
        }
    }
    else {
        creep.memory.eTarget = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
        if (!util.def(creep.memory.eTarget)) {
            return false}
        var path = creep.moveTo(nrg, {reusePath: 5, visualizePathStyle: {stroke: 'fffaaf0'}});
        return true;
    }

    dlog('not quote sure how i got here but oh well')
    return false
}

module.exports.scrounge = scrounge;

module.exports.gatherer = function(creep) {



    // if (creep.pos.isNearTo(rc) && (creep.carry.energy > 0)) {

    // On the first day, he ate one apple
    // but he was still hungry
    if (creep.carry.energy < creep.carryCapacity) {
        dlog('scrounding');
        scrounge(creep); // hit up miners and other dropped energy
    }

    // TODO standardize sinks

    // On the second day, he ate through two pears
    // but he was still hungry.
    if (creep.carry.energy < creep.carryCapacity) {
        // TODO: make this valid for every source in the room
        var mySource = creep.room.find(FIND_SOURCES)[0];
        creep.moveTo(mySource, {
            reusePath : 5
        });

        if (creep.pos.isNearTo(mySource)) {
            creep.harvest(mySource);
        }
    } else { // That night he had a stomach ache
        if (util.def(creep.memory.eTarget)) {delete creep.memory.eTarget}
        var mySink = Game.getObjectById(creep.memory.sinkId);

        if ((mySink == null) || isFull(mySink)) {
            creep.memory.sinkId = findSink(creep);
        }
        var res = creep.moveTo(mySink, {reusePath: 5, visualizePathStyle: {stroke: '#ffaaff'}});
        creep.transferEnergy(mySink);
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
        var res = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {stroke: '#ffaaff'}});
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

function findSource(creep) {

    if (!util.def(creep.room.memory.shafts)) {
        dlog('creep trying to find source in a room not setup!');
        return false;
    } else {var shafts = creep.room.memory.shafts}

    for (var post in shafts) {
        if(!util.def(shafts[post].assignedTo)) {
            shafts[post].assignedTo = creep.name;
            return shafts[post];
        }
    }
    // No open shafts
    return null;
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
