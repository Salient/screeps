var roomstrat = require('strategy');
var population = require('population');
var construct = require('cityPlanning');
var util = require('common');
var harvest = require('harvester');
var taskMaster = require('tasker');
var baseSupport = require('baseControl');
var visuals = require('visuals');
var overmind = require('overmind');
const profiler = require('screeps-profiler');
//dlog("-----------------------\n\n" + 'New Global Tick \nGenesis count ' + Game.cpu.getUsed())
//Game.f = function() {
//    for (var ff in Game.flags) {
//        Game.flags[ff].remove();
//    }
//}
//
dlog('global tick')
    ////Game.fe = function() {
    ////    for (var ff in Game.rooms) {
    ////        var res = harvest.freeEnergy(Game.rooms[ff]);
    ////        dlog('Free energy in room ' + ff);
    ////        for (var type in res) {
    ////            dlog(type + ": " + res[type])
    ////        }
    ////    }
    ////}
    //
    //Game.p = function() {
    //        for (var r in Game.rooms) {
    //            construct.p(Game.rooms[r]);
    //        }
    //    }
    //    //
    //    //Game.q = function() {
    //    //    for (var r in Game.rooms) {
    //        construct.controlLevelChange(Game.rooms[r]);
    //    }
    //}
    //
function exterminate() {
    for (var r in Game.rooms) {
        var room = (Game.rooms[r]);
        var roads = room.find(FIND_STRUCTURES, {
            filter: (i) => {
                i.structureType == STRUCTURE_ROAD
            }
        });
        util.dumpObject(roads);
        for (var it in roads) {
            roads[it].destroy();
        }
        var roads = room.find(FIND_CONSTRUCTION_SITES, {
            filter: (i) => {
                i.structureType == STRUCTURE_ROAD
            }
        });
        for (var it in roads) {
            roads[it].destroy();
        }
    }
}
Game.x = exterminate;

//
//Game.t = function() {
//    for (var r in Game.rooms) {
//  population.nextPriority(Game.rooms[r]);
//    }
//}
//
//Room.prototype.getError = function(msg) {
//    return (util.getError(msg));
//}
//Creep.prototype.getError = function(msg) {
//    return (util.getError(msg));
//}
//
//// Returns a valid path to the structure, or null?
//Creep.prototype.checkPath = function(structure) {
//    return this.room.findPath(this.pos, structure);
//}

// Welcome to the HiveMind (v0.1)
// Basic aim is to build up a room, fortify, and then spawn into adjacent rooms.
// If vacant, rinse and repeat.
// Still need to code invasion and global smarts


// This line monkey patches the global prototypes.
// Main.js logic should go here.

// Handle upper level strategy for each room
profiler.enable();
module.exports.loop = function() {
        //    dlog('\n\n New Tick ---')
        profiler.wrap(function() {
            Game.pw = function() {
                for (var r in Game.rooms) {
                    var room = Game.rooms[r];
                    construct.planRoom(room);
                }
            }

            Game.score = function() {
                dlog(overmind.getPriority());
            }

            Game.test = function() {
                var prime = Game.rooms['W7N4'];
                var source = Game.getObjectById(prime.memory.sources[0].id);


                //		var epicenter = source.pos;
                var bounds = util.bound(source.pos, 2);
                var sourceMap = source.room.lookForAtArea(LOOK_TERRAIN, bounds.top, bounds.left, bounds.bottom, bounds.right);
            }


            Game.sr = function(room) {
                dlog(overmind.scoreroom(room));
            }

            Game.getscore = function(room) {
                if (util.def(Memory.Overmind.globalTerrain[room])){
                dlog('room score of ' + room + ': ' + Memory.Overmind.globalTerrain[room].score);
                }
                else {
                dlog('room not in database')}
            
            }
            Game.rank = function() {
                var ark = Object.keys(Memory.Overmind.globalTerrain);

                var arr = ark.sort(function(a, b) {
                    var x = Memory.Overmind.globalTerrain[a];
                    var y = Memory.Overmind.globalTerrain[b];

                    if (x.score > y.score) {
                        return 1;
                    }
                    if (x.score < y.score) {
                        return -1;
                    }
                    return 0;

                });

                for (var rrr in arr) {
                    dlog(arr[rrr] + ': ' + Memory.Overmind.globalTerrain[arr[rrr]].score);
                }
            }


            Game.destroyAll = function(structure) {
                for (var ff in Game.rooms) {
                    var sits = Game.rooms[ff].find(FIND_STRUCTURES, {
                        filter: (i) => i.structureType == structure
                    });
                    for (var dd in sits) {
                        sits[dd].destroy()
                    }
                }
            }
            Game.destroySites = function(structure) {
                for (var ff in Game.rooms) {
                    var sits = Game.rooms[ff].find(FIND_CONSTRUCTION_SITES, {
                        filter: (i) => i.structureType == structure
                    });
                    for (var dd in sits) {
                        sits[dd].remove()
                    }
                }
            }
            Game.pp = function() {
                for (var room in Game.rooms) {
                    var thisRoom = Game.rooms[room];
                    construct.x(room);
                }
            }

            for (var room in Game.rooms) {
                var thisRoom = Game.rooms[room];

                // Pretty diagnostic information
				//  visuals(thisRoom);
				//                thisRoom.coolHeatmap();
				//                 thisRoom.coolEconStats();
                // dlog(thisRoom.name + ' source miss: ' + thisRoom.memory.strategy.economy.gatherMiss + ', tankMiss: ' +thisRoom.memory.strategy.economy.tankMiss); 

                //    if (!(Math.floor(thisRoom.memory.nextSpawn - Game.time) % 10)) {
                //        dlog('Next spawn in ' + thisRoom.name + ' in ' + Math.floor((thisRoom.memory.nextSpawn - Game.time)));
                //}

                //dlog('CPU ' + room.name + ': ' + Game.cpu.getUsed());
                if (!(Game.time % 27)) {
                    roomstrat.strategery(thisRoom);
                    //dlog('after strat CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                }

                //dlog('before tasking  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                //            taskMaster.taskMinions(thisRoom);
                //dlog('after tasking  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                //
                // Manage building placement, build priorities, and roads
                if (!(Game.time % 45)) {
                    thisRoom.log('construct triggered')
					    construct.planRoom(thisRoom);
                    //dlog('after construct  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                }

                if (Game.time > thisRoom.memory.nextSpawn) {
                    population.spawn(thisRoom);
                    //dlog('after spawn  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                }

                //            if (!(Game.time % 300)) {
                //                construct.refInfra(thisRoom);
                //                //dlog('after refine  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());
                //
                //            }
                //
				baseSupport.towerControl(thisRoom);
                //dlog('after base  CPU ' + thisRoom.name + ': ' + Game.cpu.getUsed());

            }


            // Information stored in Game object does not persist across ticks
            Game.dibsList = [];
            for (var dude in Game.creeps) {
                var mem = Game.creeps[dude].memory;

                if (util.def(mem.eTarget)) {
                    Game.dibsList.push(mem.eTarget);
                }
                if (util.def(mem.sinkId)) {
                    Game.dibsList.push(mem.sinkId);
                }
            }


            for (var dude in Game.creeps) {
			 taskMaster.performTask(Game.creeps[dude]);
            }

            // Need to figure out where the best place to put housekeeping stuff. 
            if (!(Game.time % 11)) {

                for (var q in Memory.creeps) {
                    if (!Game.creeps[q]) {
                        delete Memory.creeps[q];
                    }
                }
            }

            //// 
            //        if (!(Game.time % 300)) {
            //
            //            for (var r in Memory.rooms) {
            //                if (!Game.rooms[r]) {
            //                    delete Memory.rooms[r];
            //                }
            //            }
            //        }
        });
    }
    //
function dlog(msg) {
    util.dlog('MAIN', msg);
}
