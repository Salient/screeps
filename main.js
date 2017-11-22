var roomstrat = require('strategy');
var population = require('population');
var construct = require('cityPlanning');
var util = require('common');
var harvest = require('harvester');
var taskMaster = require('tasker');


// Prototype extensions
Game.f = function() {
    for (var ff in Game.flags)
    {Game.flags[ff].remove();}
}

Game.s = function() {
    for (var r in Game.rooms)
    {harvest.setupSources(Game.rooms[r]);}
}

Game.r = function() {
    for (var r in Game.rooms)
    {harvest.pokeMiners(Game.rooms[r]);}
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


// Process all the creep
for (var unit in Game.creeps) {
    taskMaster.performTask(Game.creeps[unit]);
}

// Handle upper level strategy for each room
for (var room in Game.rooms) {
    // Manage building placement, build priorities, and roads
    construct.planRoom(Game.rooms[room]);

    // Manage creep configurations, counts of each type, scale with control level
    population.breed(Game.rooms[room]);
    population.census(Game.rooms[room])

    // 
    roomstrat.strategery(Game.rooms[room]);
}

// Need to figure out where the best place to put housekeeping stuff. 

if (!(Game.time % 61)) {
    for(var q in Memory.creeps) {
        if(!Game.creeps[q]) {
            delete Memory.creeps[q];
        }
    }
    dlog('purging creeps and strategeries');
}

if (!(Game.time % 67)) {
    for (var r in Memory.rooms) {
        if(!Game.rooms[r]) {
            delete Memory.rooms[r];}
    harvest.pokeMiners(Game.rooms[r]);
    }
}

//
function dlog(msg) {
    util.dlog('MAIN', msg);
}
