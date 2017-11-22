/**
 * 
 */
var util = require('common');

var debug = false

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
function surveyRoom(room) {
    // dlog('Conducting room survey...');
    var map = room.lookAtArea(0, 0, 49, 49);
    room.memory.map = map
    room.memory.numExts = 0
    var mem = room.memory // assign it the object instead of the counter
    // value so it is referenced

    var firstGo = false;
    if (!util.def(mem.sources)) {
        mem.sources = [];
        firstGo = true;
    }
    if (!util.def(mem.paths)) {
        mem.paths = {};
        firstGo = true;
    }

    for (var tempX = 0; tempX < 50; tempX++) {
        for (var tempY = 0; tempY < 50; tempY++) {
            var curLoc = map[tempY][tempX]

            for ( var i in curLoc) {
                var hereIs = curLoc[i];

                // if it's a structure, count the type, etc.
                if (hereIs.type == 'structure') {
                    var thisStruct = hereIs.structure
                    // TODO fill in the stuff below
                    if (thisStruct.structureType == STRUCTURE_EXTENSION) {
                        mem.numExts = mem.numExts + 1
                    }
                }

                if (hereIs.type == 'constructionSite') {
                    var thisStruct = hereIs.constructionSite
                    // TODO fill in the stuff below
                    if (thisStruct.structureType == STRUCTURE_EXTENSION) {
                        mem.numExts = mem.numExts + 1
                    }
                }
                if (firstGo) {
                    // if it's a source, add it to the list of sources
                    if (hereIs.type == 'source') {
                        mem.sources.push(hereIs.source)
                    }
                }
            }
        }
    }
    if (firstGo) {
        flagRoads(room)

    }
}

var buildRoads = function(room) {
    var heatm = room.memory.heatmap;
    if (!util.def(heatm)){return}
    for (var x = 1; x<49; x++ ) {
        for (var y = 1; y<49; y++){
            if (heatm[x][y] > 40){room.createConstructionSite(x,y, STRUCTURE_ROAD)}
        }
    }
}

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


// Bootstrap code to initialize all expected data structures for the room
function bootstrap(room) {

    // Designate mining posts
    // Stores in room.memory.shafts
    setupSources(room);

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

    // Go ahead and create roads to controller and sources from spawn 

    var spawns = room.find(FIND_MY_SPAWNS);
    var shafts = room.memory.shafts;
    // TODO add terminal and minerals

    // Create roads to mineshafts
    for (var sp in spawns) {
        var thisSpawn = spawns[sp];
        for (var sh in shafts) {
            //var thisPath = room.findPath(thisSpawn.pos,shafts[sh].pos, {ignoreRoads: true) // May need to ignore roads 
            var thisPath = room.findPath(shafts[sh].pos,thisSpawn.pos);
            // Since we've spent the CPU, might as well save it for later
            room.memory.shafts[sh].path = thisPath;
            for (var st in thisPath) {
                var thisStep = thisPath[st];
                room.createConstructionSite(thisStep.x, thisStep.y, STRUCTURE_ROAD);
            }
        }

        // Create roads to controller 
        var thisPath = room.findPath(thisSpawn.pos,room.controller.pos);
        for (var st in thisPath) {
            var thisStep = thisPath[st];
            room.createConstructionSite(thisStep.x, thisStep.y, STRUCTURE_ROAD);
        }
    }
}
module.exports.surveyRoom = surveyRoom

module.exports.planRoom = function(room) {
    // Take a look around, see what needs doing

    // Priorities 
    //  1, roads,
    //  2, extensions, 
    //  3, ramparts around base perimeter, and 
    //  4,  walls around exits 

    // Sanity Checks
    if (!util.def(room.memory.heatmap)){
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


    // Stagger out 


    // Manage roads building
    buildRoads(room);

    if (!util.def(room.memory.map)) {
        room.memory.map = room.lookAtArea(0, 0, 49, 49);
        // roads
    } else {
        var map = room.memory.map; // We are only interested in non-movable
        // objects currently. Will need to
        // periodically refresh for evaluating
        // walls/creep locations
    }
    if (!util.def(room.memory.paths)) {
        room.memory.paths = {}

    }
    if (!util.def(room.memory.paths.sources)) {
        room.memory.paths.sources = []
    }
    if (!util.def(room.memory.sources)) {
        room.memory.sources = []
    }

    // aaaand here we go. create construction sites for everything we can build
    // at the current controller level
    // New structures available are extensions, walls, and ramparts
    // Later, storage, links, etc.
    placeExtensions(room)
}



function placeExtensions(room) {

    // Compare number allowed at this controller level vs. how many in room
    // Should only be called if room level has changed!


    var cap = CONTROLLER_STRUCTURES["extension"][room.controller.level];
    var have = room.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_EXTENSION}}).length;

    if (have >= cap) { return }

    // I should build more

    // Should be able to use the path stored with each mineshaft and use it to find space nearby

    for (var sh in room.memory.shafts) {
        var nrgPath = room.memory.shafts[sh].path;
		if(!util.def(nrgPath)) {
			dlog('paths not recorded in mineshaft objects - error'); 
			return
		}
        // don't start too close to the source
        if (nrgPath.length < 5) {
            continue;
        }
        for (var st=4; st<nrgPath.length; st++ ) {
            var step = nrgPath[st];

            var vicinity = room.lookAtArea( (step.y>1) ? step.y-1 : 1, 
                (step.x>1) ? step.x-1 : 1,
                (step.y<48) ? step.y+1 : 48,
                (step.x<48) ? step.x+1 : 48);
            for (let y in vicinity) {
                for (let x in vicinity[y]) {
                    // Each tile may have a different number of things to say about it. Need to go 
                    // through them all and find the terrain property
                    for (let p in vicinity[y][x]) {
                        var sq = vicinity[y][x][p];
                        if (sq.terrain != 'wall' && sq.type == 'terrain') {
                            room.createConstructionSite(x,y,STRUCTURE_ROAD); 
                        }
                    }
                }
            }
        }
    }

    return;  
}

function dlog(msg) {
    util.dlog('PLACEMENT', msg);
}
