var roomstrat = require('strategy');
var population = require('population');
var construct = require('cityPlanning');
var util = require('common');
var harvest = require('harvester');
var taskMaster = require('tasker');
//const profiler = require('screeps-profiler');


// Prototype extensions
Game.f = function() {
    for (var ff in Game.flags)
    {Game.flags[ff].remove();}
}

Game.d = function() {
    for (var ff in Game.rooms) {
        var sits = Game.rooms[ff].find(FIND_CONSTRUCTION_SITES);
        for (var dd in sits) {
            sits[dd].remove()
        }
    }
}

Game.fe = function() {
    for (var ff in Game.rooms) {
        var res=harvest.freeEnergy(Game.rooms[ff]);
        dlog('Free energy in room ' + ff);
        for (var type in res) {
            dlog(type + ": " + res[type])
        }
    }
}

Game.p = function() {
    for (var r in Game.rooms)
    {roomstrat.bootstrap(Game.rooms[r]);}
}

Game.q = function() {
    for (var r in Game.rooms)
    {construct.controlLevelChange(Game.rooms[r]);}
}

Game.x =function(room) {construct.x(room);} 

Game.t =function() {
    for (var r in Game.rooms) {
        population.nextPriority(Game.rooms[r]);} 
}    

Room.prototype.getError = function(msg) {
    return (util.getError(msg));
}
Creep.prototype.getError = function(msg) {
    return (util.getError(msg));
}

// Returns a valid path to the structure, or null?
Creep.prototype.checkPath = function(structure) {
    return this.room.findPath(this.pos, structure);
}

// Welcome to the HiveMind (v0.1)
// Basic aim is to build up a room, fortify, and then spawn into adjacent rooms.
// If vacant, rinse and repeat.
// Still need to code invasion and global smarts


// This line monkey patches the global prototypes.
//profiler.enable();
//module.exports.loop = function() {
//   profiler.wrap(function() {
// Main.js logic should go here.

// Process all the creep
for (var unit in Game.creeps) {
    taskMaster.performTask(Game.creeps[unit]);
}
// Handle upper level strategy for each room
for (var room in Game.rooms) {
    var thisRoom = Game.rooms[room];

    if (!(Game.time % 27)) {
        roomstrat.strategery(thisRoom);
    }

    // Manage building placement, build priorities, and roads
    if (!(Game.time % 15) || !thisRoom.memory.planned) {
        construct.planRoom(thisRoom);
    }
    // Manage creep configurations, counts of each type, scale with control level
    // TODO - make this smart and 
    if (Game.time > thisRoom.memory.nextSpawn)
    {  population.breed(thisRoom);}

}

// Need to figure out where the best place to put housekeeping stuff. 
if (!(Game.time % 11)) {
    for(var q in Memory.creeps) {
        if(!Game.creeps[q]) {
            delete Memory.creeps[q];
        }
    }
}

//// 
if (!(Game.time % 67)) {
    for (var r in Memory.rooms) {
        if(!Game.rooms[r]) {
            delete Memory.rooms[r];}
    }
}
//    });
//}
//
function dlog(msg) {
    util.dlog('MAIN', msg);
}
