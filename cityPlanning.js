
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

    var spwn = Game.getObjectById(room.memory.spawnId);
    var have = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: { structureType: STRUCTURE_ROAD}}).length;
    var paths = room.memory.paths;

    for (var p in paths) {
        var hwy =  paths[p];
        for (var sq in hwy){
            if (have > 5) {break;}; // Let's not get carried away
            var st = hwy[sq];
            var res =  room.createConstructionSite(st.x, st.y, STRUCTURE_ROAD);
            if (!res) {have++;}
        }
    }

    var heatm = room.memory.heatmap;

    if (!util.def(heatm)){return}
    for (var x = 1; x<49; x++ ) {
        for (var y = 1; y<49; y++){
            if (heatm[x][y] > 15){room.createConstructionSite(x,y, STRUCTURE_ROAD)}
        }
    }
}

module.exports.controlLevelChange = function (room){
    placeExtensions(room);
    placeDefences(room);
    placeContainers(room);
}

function placeWalls(room) {


}

function placeDefences(room) {

placeWalls(room);

}

// Determines how many creep can mine each source at the same time
// Assigns array with list of miner posts to room memory 
var setupSources = function (room) {

    var sources = room.find(FIND_SOURCES);
    room.memory.sources = sources;
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

function refInfra(room) {
    placeContainers(room);
}
module.exports.refInfra = refInfra;


function createBasicPaths(room) {


    // Go ahead and create roads to controller and sources from spawn 

    var spwn = Game.getObjectById(room.memory.spawnId);
    var shafts = room.memory.shafts;
    room.memory.paths = {};
    room.memory.paths.ctrl = room.controller.pos.findPathTo(spwn);

    // Create roads to mineshafts
    for (var sh in shafts) {
        room.memory.paths['shaft' + sh] = room.findPath(spwn.pos,shafts[sh].pos, {ignoreRoads: true, ignoreCreeps: true}) // May need to ignore roads 
        // var thisPath = room.findPath(shafts[sh].pos,spwn.pos);
        // Since we've spent the CPU, might as well save it for later
    }
}
// Bootstrap code to initialize all expected data structures for the room
function bootstrap(room) {

    // Designate mining posts
    // Stores in room.memory.shafts
    setupSources(room);

    var spwn= room.find(FIND_MY_SPAWNS)[0];
    if (!util.def(spwn)) {
        //this is a new room where I don't have a spawn. bail for now.
        return false;
    }
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


    // Create roads to controller 
    // Later, storage, links, etc.
    createBasicPaths(room);
    placeExtensions(room)
    placeContainers(room)

    buildRoads(room);

    room.memory.planned = true;
}

module.exports.bootstrap = bootstrap;


// Everything decays. Should look every while or so and shore up 
function refreshRoom(room) {

}
module.exports.planRoom = function(room) {

    // Take a look around, see what needs doing

    // Priorities 
    //  1, roads,
    //  2, extensions, 
    //  3, ramparts around base perimeter, and 
    //  4,  walls around exits 

    // Sanity Checks
    if (!util.def(room.memory.planned) || !util.def(room.memory.heatmap)){
        if (!bootstrap(room)) {
            return false; // bail for now
        }
    }

    //  Measure traffic around the room
    var heatm = room.memory.heatmap;

    // Cool the heat map
    // Remember we can't build roads on the first or last tile (exits)
    for (var x = 1; x<49; x++ ) {
        for (var y = 1; y<49; y++){
            if (heatm[x][y] > 0){ --heatm[x][y]} else { heatm[x][y] = 0}
        }
    }

    placeExtensions(room);



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

    // make in some checkered pattern around spawn
    //
    var origin = Game.getObjectById(room.memory.spawnId).pos;

    if (!util.def(origin)){
        dlog('big bad voodoo'); return false;
    }

    var radius = 2;
    // start at spawn +/- 2 squares
    // spiral out
    while ( have < cap ) {
        for (var xdelta = -radius + radius%2; xdelta <= radius; xdelta+=2) {
            for (var ydelta = -radius + radius%2; ydelta <=radius; ydelta+=2) {
                var site = new RoomPosition(origin.x+xdelta, origin.y+ydelta, room.name);
                var res =  room.createConstructionSite(site, STRUCTURE_EXTENSION);
                // if (res == ERR_RCL_NOT_ENOUGH){return}
                dlog('placing extension at '+(origin.x+xdelta) +','+ (origin.y + ydelta)+' resut: ' + util.getError(res));
                if (res == OK ) { have++; }
            }
        }
        radius++;
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
