
/**
 * 
 */
var util = require('common');

var debug = false

module.exports.x = placeExtensions;

//    function (room) {
//
//        var spawns = room.find(FIND_MY_SPAWNS);
//   
//    var thisPath = room.findPath(spawns[0].pos,room.controller.pos);
//        for (var st in thisPath) {
//            var thisStep = thisPath[st];
//            //            room.createConstructionSite(thisStep.x, thisStep.y, STRUCTURE_ROAD);
//                    room.createFlag(thisStep.x, thisStep.y);
//        }
//}
// Automatically place buildings as they become available.
// Run periodically to build stuff
//
//
//
// General structure placement strategy
// Rooms are 50x50 tiles, numbered 0-49
// Get map of room (store somewhere in memory?)
// Get location of spawn and all sources in the room, and controller
// find two independent paths to each and mark those tiles as roads
// place extensions all along roadsides

// FYI, max call stack size is 4500. ish. it seems to depend

// function validRoadTile(pos) {
// var map = room.memory.map;
// var tile = [ pos.y ][pos.x];
//
// for ( var entry in tile) {
// var data = tile[entry];
//
// } {return}
// }

//  // Bootstrap check
//  if (!util.def(curRoom.memory.strategy)) {
//    roomstrat.strategery(curRoom);
//    population.census(curRoom)
//  }

var buildRoads = function(room) {
    var heatm = room.memory.heatmap;
    if (!util.def(heatm)){return}
    for (var x = 1; x<49; x++ ) {
        for (var y = 1; y<49; y++){
            if (heatm[x][y] > 40){room.createConstructionSite(x,y, STRUCTURE_ROAD)}
        }
    }
}

module.exports.controlLevelChange = function (room){}

// Determines how many creep can mine each source at the same time
// Assigns array with list of miner posts to room memory 
var setupSources = function (room) {

    var sources = room.find(FIND_SOURCES);
    var shafts = {};
    var count = 0;

    for (var i in sources) {
        let srcX = sources[i].pos.x;
        let srcY = sources[i].pos.y;

        // TODO: see if maybe  lookForAtArea is more efficient?
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
                        var pos = new RoomPosition(x,y,room.name);
                        shafts['mineshaft' + count++] = {pos: pos, srcId: sources[i].id};
                    }
                }
            }
        }
    }
    // Assign it to memory and be done
    room.memory.shafts = shafts;
}

function createBasicPaths(room) {

    var spwn = Game.getObjectById(room.memory.spawnId);
    var spth = room.memory.paths.ctrl;
    for (var st in spth) {
            var thisStep = spth[st];
            room.createConstructionSite(thisStep.x, thisStep.y, STRUCTURE_ROAD);
        }

    // Go ahead and create roads to controller and sources from spawn 

    var shafts = room.memory.shafts;

    // Create roads to mineshafts
        for (var sh in shafts) {
            var thisPath = room.findPath(spwn.pos,shafts[sh].pos, {ignoreRoads: true, ignoreCreeps: true}) // May need to ignore roads 
            // var thisPath = room.findPath(shafts[sh].pos,spwn.pos);
            // Since we've spent the CPU, might as well save it for later
            room.memory.shafts[sh].path = thisPath;
            for (var st in thisPath) {
                var thisStep = thisPath[st];
                room.createConstructionSite(thisStep.x, thisStep.y, STRUCTURE_ROAD);
            }
        }
}
// Bootstrap code to initialize all expected data structures for the room
function bootstrap(room) {

    // Designate mining posts
    // Stores in room.memory.shafts
    setupSources(room);

    var spwn= room.find(FIND_MY_SPAWNS)[0];
    room.memory.spawnId  = spwn.id;
    // Track popular creep routes 
    // Create room matrix and initialize to 0
    var heatmap = [];
    for (var x = 1; x<49; x++ ) {
        heatmap[x]=[];
        for (var y = 1; y<49; y++){
            heatmap[x][y]=0;
        }
    }

    room.memory.heatmap = heatmap;
    
    if (!util.def(room.memory.paths)) {
        room.memory.paths = {}
    }

   room.memory.paths.ctrl = room.controller.pos.findPathTo(spwn);

    // Create roads to controller 
    // Later, storage, links, etc.
    placeExtensions(room)
    placeContainers(room)
    createBasicPaths(room);
    room.memory.planned = true;
}

module.exports.bootstrap = bootstrap;
module.exports.planRoom = function(room) {

    // Take a look around, see what needs doing

    // Priorities 
    //  1, roads,
    //  2, extensions, 
    //  3, ramparts around base perimeter, and 
    //  4,  walls around exits 

    // Sanity Checks
    if (!util.def(room.memory.planned)){
        bootstrap(room);}

    //  Measure traffic around the room
    var heatm = room.memory.heatmap;

    // Cool the heat map
    // Remember we can't build roads on the first or last tile (exits)
    for (var x = 1; x<49; x++ ) {
        for (var y = 1; y<49; y++){
            if (heatm[x][y] > 0){ --heatm[x][y]} else { heatm[x][y] = 0}
        }
    }





    // Manage roads building
    buildRoads(room);
}

function placeAdjacent(room, pos, structure) {

    var vicinity = room.lookAtArea( (pos.y>1) ? pos.y-1 : 1, 
        (pos.x>1) ? pos.x-1 : 1,
        (pos.y<48) ? pos.y+1 : 48,
        (pos.x<48) ? pos.x+1 : 48);
    for (let y in vicinity) {
        for (let x in vicinity[y]) {
            // Each tile may have a different number of things to say about it. Need to go 
            // through them all and find the terrain property
            for (let p in vicinity[y][x]) {
                var sq = vicinity[y][x][p];
                // util.dumpObject(sq)
                if (sq.terrain != 'wall' && sq.type == 'terrain') {
                    var odd = new RoomPosition(x,y,room.name);
                    var derp =room.createConstructionSite(odd,structure); 
                    if (derp == OK) {return true}
                    //      else {  dlog('error placing ' + structure + ', ' + util.getError(derp))
                        return false;
                    //}
                }
            }
        }
    }
}
var placeExtensions = function placeExtensions(room) {

    // Compare number allowed at this controller level vs. how many in room
    // Should only be called if room level has changed!

    var cap = CONTROLLER_STRUCTURES["extension"][room.controller.level];
    var have = room.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_EXTENSION}}).length+room.find(FIND_MY_CONSTRUCTION_SITES, {filter: { structureType: STRUCTURE_EXTENSION}}).length;
    if (have >= cap) { return }


    // I should build more

    // Should be able to use the path stored with each mineshaft and use it to find space nearby
    var shortest = 99;
    for (var sh in room.memory.shafts) {
        if (room.memory.shafts[sh].path.length < shortest) {
            shortest = room.memory.shafts[sh].path.length}
    }

    for (var st=3; st<shortest; st++ ) {
        for (var sh in room.memory.shafts) {
            var nrgPath = room.memory.shafts[sh].path;
            if(!util.def(nrgPath)) {
                dlog('paths not recorded in mineshaft objects - error'); 
                return
            }
            var step = nrgPath[st];
            if (placeAdjacent(room, step, STRUCTURE_EXTENSION)) {
                have++; 
            };
            if (have>=cap) {return true}
        }
    }
}

var placeContainers= function placeContainers(room) {

    var have = room.find(FIND_STRUCTURES, {filter: { structureType: STRUCTURE_CONTAINER}}).length+room.find(FIND_MY_CONSTRUCTION_SITES, {filter: { structureType: STRUCTURE_CONTAINER}}).length;
    if ((have == 5) || (have >= Object.keys(room.memory.shafts).length )) { return } // stagger one per level to spread out construcution

    for (var x in room.memory.shafts) {
        var shaft = room.memory.shafts[x];
        var site = new RoomPosition(shaft.pos.x, shaft.pos.y, room.name);
        util.dumpObject(site)
        var res =  room.createConstructionSite(site, STRUCTURE_CONTAINER);
        dlog('added container: ' + util.getError(res));
    }
}


module.exports.placeExtensions = placeExtensions;
module.exports.placeContainers = placeContainers;
function dlog(msg) {
    util.dlog('PLACEMENT', msg);
}
