var roomstrat = require('strategy');
var population = require('population');
var construct = require('cityPlanning');
var util = require('common');
var harvest = require('harvester');
var taskMaster = require('tasker');
var baseSupport = require('baseControl');
var visuals = require('visuals')
    //const profiler = require('screeps-profiler');
    //dlog("-----------------------\n\n" + 'New Global Tick \nGenesis count ' + Game.cpu.getUsed())
    //Game.f = function() {
    //    for (var ff in Game.flags) {
    //        Game.flags[ff].remove();
    //    }
    //}
    //
    //Game.d = function() {
    //        for (var ff in Game.rooms) {
    //            var sits = Game.rooms[ff].find(FIND_CONSTRUCTION_SITES);
    //            for (var dd in sits) {
    //                sits[dd].remove()
    //            }
    //        }
    //    }
    //
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
//profiler.enable();
module.exports.loop = function() {
        //    dlog('\n\n New Tick ---')
        //   profiler.wrap(function() {
Game.pw = function (){
    for (var r in Game.rooms) {
        var room = Game.rooms[r];
        construct.placeWalls(room);
    }
}

        for (var room in Game.rooms) {
            var thisRoom = Game.rooms[room];

            // Pretty diagnostic information
            visuals(thisRoom);
            construct.coolmap(thisRoom);

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
            if (!(Game.time % 15) || !thisRoom.memory.planned) {
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
        if (!(Game.time % 67)) {

            for (var r in Memory.rooms) {
                if (!Game.rooms[r]) {
                    delete Memory.rooms[r];
                }
            }
        }
        //    });
    }
    //
function dlog(msg) {
    util.dlog('MAIN', msg);
}
