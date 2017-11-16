var util = require('common');

var DEBUG_HARVEST = true;

function dlog(msg) {
    util.dlog('HARVEST', msg);
}


////////////////////////////////////////////////////////////////////////
////// Begin Next Gen Code
////////////////////////////////////////////////////////////////////////


// For new rooms, determines how many creep can mine each source at the same time
// Returns array with list of miner posts sorted ascending by distance to source
module.exports.setupSources = function setupSources(room) {
    
    var sources = room.find(FIND_SOURCES);
    var shafts = {};
    var count = 0;
   
    for (var i in sources) {
        let srcX = sources[i].pos.x;
        let srcY = sources[i].pos.y;

        var vicinity = room.lookAtArea( (srcY>1) ? srcY-1 : 1, 
            (srcX>1) ? srcX-1 : 1,
            (srcY<48) ? srcY+1 : 48,
            (srcX<48) ? srcX+1 : 48);
        for (let y in vicinity) {
            for (let x in vicinity[y]) {
                // Each tile may have a different number of things to say about it. Need to go 
                // through them all and find the terrain property
                for (let p in vicinity[y][x]) {
                    var sq = vicinity[y][x][p];
                    if (sq.terrain != 'wall' && sq.type == 'terrain') {
                        shafts['mineshaft' + count++] = new RoomPosition(x,y,room.name);
                    }
                }
            }
        }
    }
    return shafts;
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
    if (!util.def(creep.memory.srcId)
        || !util.def(Game.getObjectById(creep.memory.srcId))) {


        var newsource = findSource(creep);
        if (util.def(newsource)) {
            creep.memory.srcId = findSource(creep);
        } else
        { dlog('Error, could not assign new source to ' + creep.name);
        }}

    var mySrc = Game.getObjectById(creep.memory.srcId);

    if (creep.pos.isNearTo(mySrc)
        && ((creep.carry.energy < creep.carryCapacity) || (creep.carryCapacity == 0))) {
        var result = creep.harvest(mySrc);
        //var result = true;
        if (!result) {
            return true
        }

        if ((result == ERR_NOT_ENOUGH_ENERGY)) {
            // over mined this source
            dlog(creep.name + ' source is too crowded, finding something else')
            creep.memory.srcId = findSource(creep);
            return true
        }

        if ((result != ERR_TIRED)) {
            dlog(' - ' + creep.name + ': Error trying to mine source ' + mySrc
                + ', ' + util.getError(result))
            return false
        } else {
            return true
        }
    } else if (creep.carry.energy == 0) {
        var res = creep.moveTo(mySrc, {reusePath: 5, visualizePathStyle: {stroke: '#ffaa00'}});
        if (!res ||  res == ERR_TIRED ) {
            return true;
        } else {
            if (!util.def(mySrc)) {
                dlog('no open sources available to assign');
                return false;}
        }
    }

    // if (!util.def(creep.memory.sinkId)
    // || !util.def(Game.getObjectById(creep.memory.sinkId))) {
    // creep.memory.sinkId = findSink(creep);
    // }
    //
    // var mySink = Game.getObjectById(creep.memory.sinkId);
    //
    // if (creep.pos.isNearTo(mySink) && (creep.carry.energy > 0)) {
    // creep.transferEnergy(mySink)
    // } else if ((creep.carry.energy == creep.carryCapacity)
    // && (creep.carryCapacity != 0)) {
    // var result = creep.moveTo(mySink)
    //
    // if (!result) {
    // return true
    //
    // } else if (result != ERR_TIRED) {
    // dlog(' - ' + creep.name + ': Error trying to (mine) sink ' + mySink
    // + ', ' + util.getError(result))
    // }
    // } else {
    // var result = creep.moveTo(mySrc)
    // if (!result) {
    // return true
    //
    // } else if (result != ERR_TIRED) {
    // dlog(' - ' + creep.name + ': Error returning to mine sink '
    // + mySink + ', ' + util.getError(result))
    //
    // }
    // }
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
    if (creep.carry.energy == creep.carryCapacity) {return
    }
    var scrounges = creep.room.find(FIND_DROPPED_RESOURCES); // TODO possible
    // efficiency gain
    // here
    // I guess the idea is to push a move task onto the taskList to move to a
    // certain source, and then just find the nearest energy?

    if (scrounges.length) {
        // sort by distance
        //        scrounges.sort(function(a, b) {

        //            var toA = distance(creep.pos, a.pos)
        //            var toB = distance(creep.pos, b.pos)
        //            var enA = a.energy;
        //            var enB = b.energy;
        //
        //            // Fancy choosing algorithm to see if it's worth going out of the
        //            // way
        //            // (not really fancy)
        //
        //            var weightA = toA / enA;
        //            var weightB = toB / enB;
        //
        //            if (weightA < weightB) {
        //                return -1
        //            } else if (weightA > weightB) {
        //                return 1
        //            } else {
        //                return 0
        //            }
        //        })
        //
        //        var srcs = creep.room.memory.sources;
        //        for ( var s in scrounges) {
        //            var nrg = scrounges[s]
        //
        //            // Determine if it's random dropped energy or mined
        //
        //            var minDist
        //
        //            for ( var src in srcs) {
        //                var disSrc = srcs[src];
        //
        //                var disDistance = distance(disSrc.pos, nrg.pos)
        //                if (!util.def(disDistance)) {
        //                    dlog('error')
        //                    util.dumpObject(disDistance)
        //                }
        //
        //                if (!util.def(minDist)) {
        //                    minDist = disDistance
        //                }
        //                if (disDistance < minDist) {
        //                    minDist = disDistance
        //                }
        //            }
        //            //
        //            // if (((disDistance == 1) && (mode == 'collect'))
        //            // || ((disDistance > 1) && (mode == 'sweep'))) {
        //            // rightMode = true
        //            // break;
        //            // }
        //
        //            if (((minDist == 1) && (mode == 'sweep'))
        //                || ((minDist > 1) && (mode == 'collect'))) {
        //                // dlog('wrong mode')
        //                return false;
        //            }
        //
        // dlog('right mode...')

        if (creep.pos.isNearTo(scrounges[0])) {
            var res = creep.pickup(scrounges[0]);
            if (!res) {
                return true
            } else {
                dlog('Error scroundng for NRG, creep ' + creep.name + ','
                    + util.getError(res));
                return false;
            }
            // } else {
            // // dlog('success pkup')
            // break;
            // }
        } else {
            var path = creep.moveTo(scrounges[0], {reusePath: 5, visualizePathStyle: {stroke: 'fffaaf0'}});
        }


        //            if (creep.carry.energy != creep.carryCapacity) {
        //                // dlog(creep.name + ' - imma hunting')
        //
        //                // ////////////////////////////////////////
        //                // / Begin cock block prevention code
        //
        //                var mines = [];
        //                var check;
        //                var route;
        //                while (true) {
        //
        //                    // dlog('trying to get to ' + scrounges[s])
        //                    // dlog('while avoinding' + mines)
        //                    route = creep.room.findPath(creep.pos, scrounges[s].pos, {
        //                        // 'avoid' : mines,
        //                        // 'ignore' : [ scrounges[s].pos ],
        //                        'ignoreCreeps' : true
        //                    })
        //
        //                    if (route.length == 0) {
        //                        break;
        //                    }
        //
        //                    var step = route[0];
        //                    check = new RoomPosition(step.x, step.y, creep.room.name);
        //                    var redFlag = false
        //
        //                    for ( var src in srcs) {
        //                        var disSrc = srcs[src];
        //                        var disDistance = distance(disSrc.pos, check)
        //                        // dlog('next step dist. is ' + disDistance)
        //                        if (disDistance == 1) {
        //                            mines.push(check)
        //                            redFlag = true
        //                        }
        //                    }
        //
        //                    if (redFlag) {
        //                        continue;
        //                    } else {
        //                        break;
        //                    }
        //                }
        //
        //                // // End cock block prevention
        //                // /////////////////////////////////////////
        //
        //                if (!check) {
        //                    dlog('no route??')
        //                    return false
        //                }
        //                var res = creep.move(route[0].direction); // don't stomp
        //                if (!res) {
        //                    return true
        //                } else {
        //                    if ((res != ERR_TIRED)) {
        //                        dlog('Error moving to NRG: ' + creep.name + ' - '
        //                            + util.getError(res))
        //                        // util.dumpObject(check);
        //                        return false;
        //                    }
        //                }
        //            }
    }
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
    var sources = creep.room.find(FIND_SOURCES);
    var distances = [];

    // dlog('Finding source for ' + creep.name);

    for ( var i in sources) {
        var source = sources[i];
        var srcId = source.id;
        distances.push({
            "srcId" : srcId,
            "srcPos" : source.pos,
            "distance" : distance(creep.pos, source.pos),
            "energy" : source.energy,
            "energyCapacity" : source.energyCapacity
            // "full" : isFull(struct) // TODO, add energy evailable weighting
        });
    }

    if (distances.length == 0) {
        dlog("Error finding source");
        return false
    }


    // Sort by distances
    distances.sort(function(a, b) {
        var weightA = a.distance * b.energy / b.energyCapacity
        var weightB = b.distance * a.energy / a.energyCapacity

        return (weightA < weightB) ? -1 : 1;
    });


    // Go to closest
    for (var x in distances) {
        var res = creep.moveTo(distances[x].srcPos, {reusePath: 5, visualizePathStyle: {stroke: '#ffaaff'}});
        if (!res || res == ERR_TIRED) {
            return distances[0].srcId;
        }
    }
    dlog('Mining is cockblocked or something is off');

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
