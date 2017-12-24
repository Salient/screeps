/**
 * 
 */
var util = require('common');

var debug = false


// General structure placement strategy
// Rooms are 50x50 tiles, numbered 0-49
// Get map of room (store somewhere in memory?)
// Get location of spawn and all sources in the room, and controller
// find two independent paths to each and mark those tiles as roads

// FYI, max call stack size is 4500. ish. it seems to depend


Room.prototype.needStructure = function(structure) {

    var origin = Game.getObjectById(this.memory.spawnId).pos;
    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    var cap = CONTROLLER_STRUCTURES[structure][this.controller.level];
    var have = this.find(FIND_MY_STRUCTURES, {
        filter: {
            structureType: structure
        }
    }).length + this.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: structure
        }
    }).length;
    if (have >= cap) {
        return 0;
    } else {
        return (cap - have);
    }
}

function zeroHeatMap(room) {
    var hm = room.memory.heatmap;
    for (var x in hm) {
        var y = hm[x];
        for ( var sq in y){
       y[sq] = 0; 
        }
    }
}

var buildRoads = function(room) {

    if (!util.def(room.memory.planned) || room.memory.planned == false) {
        return;
    }

    var spwn = Game.getObjectById(room.memory.spawnId);
    var have = room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: STRUCTURE_ROAD
        }
    }).length;
    var paths = room.memory.infrastructure.paths;

    for (var p in paths) {
        var hwy = paths[p];
        for (var sq in hwy) {
            if (have > room.memory.strategy.construction.maxBuildSites) {
                zeroHeatMap(room);
                return true;;
            }; // Let's not get carried away
            var st = hwy[sq];
            var res = room.createConstructionSite(st.x, st.y, STRUCTURE_ROAD);
            if (!res) {
                have++;
            }
        }
    }

    var heatm = room.memory.heatmap;
    var infraVars = room.memory.strategy.construction;

    if (!util.def(heatm)) {
        return
    }
    for (var x = 1; x < 49; x++) {
        for (var y = 1; y < 49; y++) {
            if (heatm[x][y] > 25) {
                if (have > infraVars.maxBuildSites * room.controller.level) {
                    return true;
                }
                var res = room.createConstructionSite(x, y, STRUCTURE_ROAD)
                if (!res) {
                    have++;
                }
            }
        }
    }
}

module.exports.controlLevelChange = function(room) {
    placeExtensions(room);
    placeDefenses(room);
    placeContainers(room);
}

var markExitDoors = function(room) {
    dlog('marking')
    var top = [];
    var bot = [];
    var left = [];
    var right = [];

    for (var x = 0; x < 50; x++) {
        var tileA = Game.map.getTerrainAt(x, 0, room.name);
        var tileB = Game.map.getTerrainAt(x, 49, room.name);
        top[x] = (tileA != 'wall') ? 1 : 0;
        bot[x] = (tileB != 'wall') ? 1 : 0;
    }

    for (var y = 0; y < 50; y++) {
        var tileA = Game.map.getTerrainAt(0, y, room.name);
        var tileB = Game.map.getTerrainAt(49, y, room.name);
        left[y] = (tileA != 'wall') ? 1 : 0;
        right[y] = (tileB != 'wall') ? 1 : 0;
    }

    if (!util.def(room.memory.infrastructure)) {
        room.memory.infrastructure = {}
    }

    var exits = {
        top: top,
        bot: bot,
        left: left,
        right: right
    }

    dlog('marked')
    util.dumpObject(exits)
        // Spent the CPU, might as well save it
    room.memory.infrastructure.exits = exits;
    room.memory.infrastructure.exitDoors = {};

    // mark one spot to be a rampart
    for (var side in exits) {
        var wall = exits[side];
        dlog('looping ' + side)
        util.dumpObject(wall)

        var start = 0;
        var end = 0;
        var outer = 0;
        while (!wall[outer] && outer < 50) {
            outer++;
            dlog('inner loop 1')
        }
        // if outer is 50, then there are no exits on this side
        if (outer == 50) {
            room.memory.infrastructure.exitDoors.side = 0;
            continue;
        }
        start = outer;
        while (wall[outer] && outer < 50) {
            outer++;
        }
        end = outer;
        util.dumpObject(exits)
        util.dumpObject(room.memory.infrastructure.exitDoors);
        room.memory.infrastructure.exitDoors.side = (Math.floor((end - start) / 2) + start);
    }
}



module.exports.markWalls = markExitDoors;;

function placeWalls(room) {
    if (!util.def(room.memory.infrastructure.exitDoors)) {
        markExitDoors(room);
    }

    var exits = room.memory.infrastructure.exitDoors;

    if (exits.top > 0) {
        room.createConstructionSite(exits.top, 2, STRUCTURE_RAMPART);

    }
    room.createConstructionSite(exits.bot, 47, STRUCTURE_RAMPART);
    room.createConstructionSite(2, exits.left, STRUCTURE_RAMPART);
    room.createConstructionSite(47, exits.right, STRUCTURE_RAMPART);

    for (var x = 2; x < 48; x++) {
        room.createConstructionSite(x, 2, STRUCTURE_WALL);
        room.createConstructionSite(x, 47, STRUCTURE_WALL);
        room.createConstructionSite(2, x, STRUCTURE_WALL);
        room.createConstructionSite(47, x, STRUCTURE_WALL);
    }
}

function startWall(pos) {
    var x = (pos.x < 1) ? 1 : (pos.x > 48) ? 48 :
        pos.x;
    var y = (pos.y < 1) ? 1 : (pos.y > 48) ? 48 :
        pos.y;
    var site = new RoomPosition(x, y, pos.roomName);
    site.createConstructionSite(STRUCTURE_WALL);
}
// module.exports.p = placeWalls;

function placeDefenses(room) {
    placeWalls(room);
}

// Determines how many creep can mine each source at the same time
// Assigns array with list of miner posts to room memory
//
// May be obviated down the road if I can calculate how many miners I need
var setupSources = function(room) {

    var sources = room.find(FIND_SOURCES);
    room.memory.sources = sources;
    var shafts = {};
    var count = 0;

    for (var i in sources) {
        let srcX = sources[i].pos.x;
        let srcY = sources[i].pos.y;

        // TODO: see if maybe lookForAtArea is more efficient?
        var vicinity = room.lookAtArea((srcY > 1) ? srcY - 1 : 1,
            (srcX > 1) ? srcX - 1 : 1, (srcY < 48) ? srcY + 1 : 48,
            (srcX < 48) ? srcX + 1 : 48);
        for (let y in vicinity) {
            for (let x in vicinity[y]) {
                // Each tile may have a different number of things to say about
                // it. Need to go
                // through them all and find the terrain property
                for (let p in vicinity[y][x]) {
                    var sq = vicinity[y][x][p];
                    if (sq.terrain != 'wall' && sq.type == 'terrain') {
                        var pos = new RoomPosition(x, y, room.name);
                        shafts['mineshaft' + count++] = {
                            pos: pos,
                            srcId: sources[i].id
                        };
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
    room.memory.infrastructure.paths = {};
    room.memory.infrastructure.paths.ctrl = room.controller.pos.findPathTo(spwn);

    // Create roads to mineshafts
    for (var sh in shafts) {
        room.memory.infrastructure.paths['shaft' + sh] = room.findPath(spwn.pos,
                shafts[sh].pos, {
                    ignoreRoads: true,
                    ignoreCreeps: true
                }) // May need to ignore roads
            // var thisPath = room.findPath(shafts[sh].pos,spwn.pos);
            // Since we've spent the CPU, might as well save it for later
    }
}
// Bootstrap code to initialize all expected data structures for the room
function bootstrap(room) {

    room.memory.infrastructure = {};

    // Designate mining posts
    // Stores in room.memory.shafts
    setupSources(room);

    var spwn = room.find(FIND_MY_SPAWNS)[0];
    if (!util.def(spwn)) {
        // this is a new room where I don't have a spawn. bail for now.
        return false;
    }
    room.memory.spawnId = spwn.id;
    // Track popular creep routes
    // Create room matrix and initialize to 0
    var heatmap = [];
    for (var x = 1; x < 49; x++) {
        heatmap[x] = [];
        for (var y = 1; y < 49; y++) {
            heatmap[x][y] = 0;
        }
    }

    room.memory.heatmap = heatmap;

    // Create roads to controller
    // Later, storage, links, etc.
    createBasicPaths(room);
    // markWalls(room);

    room.memory.planned = true;
    return true;
}

module.exports.bootstrap = bootstrap;

// Everything decays. Should look every while or so and shore up
function refreshRoom(room) {

}


function planRoom(room) {
    // Take a look around, see what needs doing

    // Priorities
    // 1, roads,
    // 2, extensions,
    // 3, ramparts around base perimeter, and
    // 4, walls around exits
    // Sanity Checks

    if (!util.def(room.memory.planned) || !util.def(room.memory.heatmap)) {
        if (!bootstrap(room)) {
            return false; // bail for now
        }
    }
    placeExtensions(room);
    placeContainers(room)
    placeTower(room);

    //if (!(Game.time % 17)) {
            buildRoads(room);
    // }
    // Manage roads building
}


module.exports.planRoom = planRoom;
module.exports.coolmap = function(room) {
    // Measure traffic around the room
    if (!util.def(room.memory.heatmap)) {
        return;
    }
    var heatm = room.memory.heatmap;

    // Cool the heat map
    // Remember we can't build roads on the first or last tile (exits)
    for (var x = 1; x < 49; x++) {
        for (var y = 1; y < 49; y++) {
            if (heatm[x][y] > 0) {
                --heatm[x][y]
            } else {
                heatm[x][y] = 0
            }
        }
    }
}

function placeAdjacent(room, pos, structure) {

    var vicinity = room.lookAtArea((pos.y > 1) ? pos.y - 1 : 1,
        (pos.x > 1) ? pos.x - 1 : 1, (pos.y < 48) ? pos.y + 1 : 48,
        (pos.x < 48) ? pos.x + 1 : 48);
    for (let y in vicinity) {
        for (let x in vicinity[y]) {
            // Each tile may have a different number of things to say about it.
            // Need to go
            // through them all and find the terrain property
            for (let p in vicinity[y][x]) {
                var sq = vicinity[y][x][p];
                // util.dumpObject(sq)
                if (sq.terrain != 'wall' && sq.type == 'terrain') {
                    var odd = new RoomPosition(x, y, room.name);
                    var derp = room.createConstructionSite(odd, structure);
                    if (derp == OK) {
                        return true
                    }
                    // else { dlog('error placing ' + structure + ', ' +
                    // util.getError(derp))
                    return false;
                    // }
                }
            }
        }
    }
}

function placeTower(room) {
    var placeNum = room.needStructure(STRUCTURE_TOWER);
    var origin = Game.getObjectById(room.memory.spawnId).pos;

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    // Placement plan for towers - place close, but not too close, to the spawn

    var radius = 3;
    // start at spawn +/- 2 squares
    // spiral out
    while (placeNum > 0) {
        for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, room.name);
                var res = room.createConstructionSite(site, STRUCTURE_TOWER);
                if (res == OK) {
                    placeNum--;;
                }
            }
        }
        radius++;
    }
}

var placeExtensions = function placeExtensions(room) {

    // Compare number allowed at this controller level vs. how many in room
    // Should only be called if room level has changed!
    var placeNum = room.needStructure(STRUCTURE_EXTENSION);
    var origin = Game.getObjectById(room.memory.spawnId).pos;

    // make in some checkered pattern around spawn
    //

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    var radius = 2;
    // start at spawn +/- 2 squares
    // spiral out
    while (placeNum > 0) {
        for (var xdelta = -radius + radius % 2; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, room.name);
                var res = room
                    .createConstructionSite(site, STRUCTURE_EXTENSION);
                // if (res == ERR_RCL_NOT_ENOUGH){return}
                dlog('placing extension at ' + (origin.x + xdelta) + ',' +
                    (origin.y + ydelta) + ' resut: ' + util.getError(res));
                if (res == OK) {
                    placeNum--;
                }
            }
        }
        radius++;
    }
}

var placeContainers = function placeContainers(room) {

    var have = room.find(FIND_STRUCTURES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    }).length + room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    }).length;
    if ((have == 5) || (have >= Object.keys(room.memory.shafts).length)) {
        return





    } // stagger one per level to spread out construcution

    for (var x in room.memory.shafts) {
        var shaft = room.memory.shafts[x];
        var site = new RoomPosition(shaft.pos.x, shaft.pos.y, room.name);
        var res = room.createConstructionSite(site, STRUCTURE_CONTAINER);
        // dlog('added container: ' + util.getError(res));
    }
}

module.exports.placeExtensions = placeExtensions;
module.exports.placeContainers = placeContainers;
module.exports.bd = placeDefenses;

function dlog(msg) {
    util.dlog('PLACEMENT', msg);
}
module.exports.x = placeExtensions;
