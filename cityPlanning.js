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
Room.prototype.planRoom = function() {
    planRoom(this);
}

Room.prototype.purgeSites = function() {

    for (var site in Game.constructionSites) {
        var thisSite = Game.constructionSites[site];
        if (!thisSite.room) {
            thisSite.remove();
        }
    }
}

Room.prototype.schemaCheck = function() {

    this.memory.trafficMap = this.memory.trafficMap || {};
    this.memory.cache = this.memory.cache || {};
    this.memory.cache.construction = this.memory.cache.construction || {};

    if (!this.controller || !this.controller.my) {
        return;
    }

    this.memory.infrastructure = this.memory.infrastructure || {};
    // this.memory.links = this.memory.links || {};

    if (!this.memory.links) {
        var dat = this.find(FIND_MY_STRUCTURES, {
            filter: {
                structureType: STRUCTURE_LINK
            }
        });

        if (dat.length > 0) {
            for (var dit in dat) {
                dat[dit].destroy();
            }
        }

        dat = this.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: {
                structureType: STRUCTURE_LINK

            }
        });

        if (dat.length > 0) {
            util.dumpObj(dat)
            for (var dit in dat) {
                dat[dit].remove();
            }
        }
        this.memory.links = {}
    }
    this.log('Schema updated');
}

Room.prototype.needStructure = function(structure) {

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

Room.prototype.buildRoads = function() {
    // try to cut down on the number of construction sites,

    if (!Game.rooms[this.name]) {
        this.log('ohi see there');

    }
    // this.log(
    var maxBuild = 2;

    if (this.memory.strategy && this.memory.strategy.construction) {
        maxBuild = this.memory.strategy.construction.maxBuildSites;
    }

    var have = this.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: STRUCTURE_ROAD
        }
    }).length;

    if (have >= maxBuild) {
        // this.log('ack road overload')
        return false;
    }

    if (util.def(this.memory.planned) && this.memory.planned == true) {
        var paths = this.memory.infrastructure.paths;

        for (var p in paths) {
            var hwy = paths[p];
            for (var sq in hwy) {
                if (have >= maxBuild) {
                    return true;;
                }; // Let's not get carried away
                var st = hwy[sq];
                var res = this.createConstructionSite(st.x, st.y,
                    STRUCTURE_ROAD);
                if (!res) {
                    have++;
                }
            }
        }
    }

    // Taken care of explicit paths
    // start at the top and look for any tile that has high traffic

    // this.log('scoring traffic for road building');
    var map = this.memory.trafficMap;
    // this.log('road have ' + have + ', max: ' + maxBuild)
    // this.log('poop')
    // Remember we can't build roads on the first or last tile (exits)
    for (var x in map) {
        if (x == 0 || x == 49) { // build on even tiles to cut down on mess
            continue;
        }
        // if (!util.def(map[x])) {
        // map[x] = {};
        // }

        for (var y in map[x]) {
            if (y == 0 || y == 49) {
                continue;
            }
            var thisSpot = map[x][y];

            thisSpot.heat = thisSpot.heat - (Game.time - thisSpot.refreshed);
            thisSpot.heat = (thisSpot.heat <= 0) ? 0 : thisSpot.heat;
            thisSpot.refreshed = Game.time;
            if (thisSpot.heat == 0) {
                delete thisSpot;
                continue;
            }

            if (+thisSpot.heat > 45) {
                if (have >= maxBuild) {
                    return true;
                }; // Let's not get carried away
                var res = this.createConstructionSite(+x, +y, STRUCTURE_ROAD);
                switch (res) {
                    case OK:
                        // this.log('placing road')
                        have++;
                        break;
                    case ERR_FULL:
                        util.purgeOldConstruction();
                        break;
                    case ERR_INVALID_TARGET:
                        break;
                    default:
                        this.log('Error placing road site, ' + util.getError(res) +
                            '; ' + x + ',' + y);
                }
            }
        }
    }
}

module.exports.controlLevelChange = function(room) {
    room.placeExtensions();
    // room.placeDefenses();
    room.placeContainers();
}

Room.prototype.markExitDoors = function() {
    dlog('marking')
    var top = [];
    var bot = [];
    var left = [];
    var right = [];

    for (var x = 0; x < 50; x++) {
        var tileA = Game.map.getTerrainAt(x, 0, this.name);
        var tileB = Game.map.getTerrainAt(x, 49, this.name);
        top[x] = (tileA != 'wall') ? 1 : 0;
        bot[x] = (tileB != 'wall') ? 1 : 0;
    }

    for (var y = 0; y < 50; y++) {
        var tileA = Game.map.getTerrainAt(0, y, this.name);
        var tileB = Game.map.getTerrainAt(49, y, this.name);
        left[y] = (tileA != 'wall') ? 1 : 0;
        right[y] = (tileB != 'wall') ? 1 : 0;
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
    this.memory.infrastructure.exits = exits;
    this.memory.infrastructure.exitDoors = {};

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
            this.memory.infrastructure.exitDoors.side = 0;
            continue;
        }
        start = outer;
        while (wall[outer] && outer < 50) {
            outer++;
        }
        end = outer;
        util.dumpObject(exits)
        util.dumpObject(this.memory.infrastructure.exitDoors);
        this.memory.infrastructure.exitDoors.side = (Math
            .floor((end - start) / 2) + start);
    }
}

Room.prototype.placeWalls = function() {
    if (!util.def(this.memory.infrastructure.exitDoors)) {
        this.markExitDoors();
    }

    var exits = this.memory.infrastructure.exitDoors;

    if (exits.top > 0) {
        this.createConstructionSite(exits.top, 2, STRUCTURE_RAMPART);

    }
    this.createConstructionSite(exits.bot, 47, STRUCTURE_RAMPART);
    this.createConstructionSite(2, exits.left, STRUCTURE_RAMPART);
    this.createConstructionSite(47, exits.right, STRUCTURE_RAMPART);

    for (var x = 2; x < 48; x++) {
        this.createConstructionSite(x, 2, STRUCTURE_WALL);
        this.createConstructionSite(x, 47, STRUCTURE_WALL);
        this.createConstructionSite(2, x, STRUCTURE_WALL);
        this.createConstructionSite(47, x, STRUCTURE_WALL);
    }
}

function startWall(pos) {
    var x = (pos.x < 1) ? 1 : (pos.x > 48) ? 48 : pos.x;
    var y = (pos.y < 1) ? 1 : (pos.y > 48) ? 48 : pos.y;
    var site = new RoomPosition(x, y, pos.roomName);
    site.createConstructionSite(STRUCTURE_WALL);
}
// module.exports.p = placeWalls;

function placeDefenses(room) {
    room.placeWalls();
}

// Determines how many creep can mine each source at the same time
// Assigns array with list of miner posts to room memory
//
// May be obviated down the road if I can calculate how many miners I need
var setupSources = function(room) {
    // if (!room.controller) {
    // return false;
    // }
    var sources = room.find(FIND_SOURCES);
    if (sources.length == 0) {
        return false;
    }

    room.memory.sources = {};
    for (var src in sources) {
        room.memory.sources[sources[src].id] = {};
    }
    // room.memory.sources = sources;
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
module.exports.setupSources = setupSources;

function refInfra(room) {
    placeContainers(room);
}
module.exports.refInfra = refInfra;

Room.prototype.createBasicPaths = function() {

        // Go ahead and create roads to controller and sources from spawn

        var spwn = Game.getObjectById(this.memory.spawnId);
        var shafts = this.memory.shafts;
        this.memory.infrastructure.paths = {};
        this.memory.infrastructure.paths.ctrl = this.controller.pos
            .findPathTo(spwn);

        // Create roads to mineshafts
        for (var sh in shafts) {
            this.memory.infrastructure.paths['shaft' + sh] = this.findPath(
                    spwn.pos, shafts[sh].pos, {
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

    // Order array by name in case there is more than one spawn. we want the
    // original
    var spwn = room.find(FIND_MY_SPAWNS).sort()[0];

    if (!util.def(spwn)) {
        room.placeSpawn();
        // this is a new room where I don't have a spawn. bail for now.
        return false;
    }
    room.memory.spawnId = spwn.id;

    // Create roads to controller
    // Later, storage, links, etc.
    room.createBasicPaths();

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

    if (!util.def(room.memory.cache)) {
        room.schemaCheck();
    }

    room.memory.cache.construction.active = room
        .find(FIND_MY_CONSTRUCTION_SITES).length;

    // should do this even if room isn't owned
    room.buildRoads();

    if (!util.def(room.memory.planned)) {
        if (!bootstrap(room)) {
            return false; // bail for now
        }
    }
    room.placeExtensions();
    room.placeContainers()
    room.placeTower();
    room.placeStorage();
    room.placeLinks();
    // room.placeSpawn();

    // if (!(Game.time % 17)) {
    // }
    // Manage roads building
}

module.exports.planRoom = planRoom;

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

Room.prototype.placeTower = function() {

    var placeNum = this.needStructure(STRUCTURE_TOWER);
    var origin = Game.getObjectById(this.memory.spawnId).pos;

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    // Placement plan for towers - place close, but not too close, to the spawn

    var radius = 3;
    while (placeNum > 0 && radius < 6) {
        dance: for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, this.name);
                var res = this.createConstructionSite(site, STRUCTURE_TOWER);
                switch (res) {
                    case OK:
                        placeNum--;
                        break dance;
                        break;
                    case ERR_FULL:
                        util.purgeOldConstruction();
                        break;
                    default:
                        this.log('placing tower, result: ' + util.getError(res))
                }
            }
        }
        radius++;
    }
}

Room.prototype.placeStorage = function() {

    var placeNum = this.needStructure(STRUCTURE_STORAGE);
    var origin = Game.getObjectById(this.memory.spawnId).pos;

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    // Placement plan for towers - place close, but not too close, to the spawn

    var radius = 5;
    while (placeNum > 0) {
        for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, this.name);
                var res = this.createConstructionSite(site, STRUCTURE_STORAGE);
                if (res == OK) {
                    placeNum--;;
                }
            }
        }
        radius++;
    }
}

Room.prototype.checkReserved = function(pos) {
    // run through known reserved spots

    if (util.def(this.memory.shafts)) {
        for (var shaft in this.memory.shafts) {
            var thisShaft = this.memory.shafts[shaft];
            if (thisShaft.pos.x == pos.x && thisShaft.pos.y == pos.y) {
                return false;
            }
        }
    }
    return true;
}

Room.prototype.placeExtensions = function() {


    if (!util.def(this.memory.infrastructure) || !util.def(this.memory.infrastructure.paths)) {
        return false;
    }

    var placeNum = this.needStructure(STRUCTURE_EXTENSION);
    var paths = this.memory.infrastructure.paths;

    var tmpmap = [];
    //   create bit map of paths in room
    for (var path in paths) {
        for (var step in paths[path]) {
            var stone = paths[path][step];
            if (!tmpmap[stone.x]) {
                tmpmap[stone.x] = [];
            }
            tmpmap[stone.x][stone.y] = 1;
        }
    }

    for (var path in paths) {

        for (var step in paths[path]) {
            if (placeNum == 0) {
                return true;
            }
            var stone = paths[path][step];

            for (var skip in util.sequence) {
                var hop = util.sequence[skip];


                // this.log('testing ' + stone.x + ' + ' + hop.x + ',' + stone.y + ' + ' + hop.y)
                if (util.def(tmpmap[stone.x + hop.x]) && tmpmap[stone.x + hop.x][stone.y + hop.y] == 1) {
                    continue;
                }

                // this.log('hh')
                if (this.isAdjacentClear({
                        x: stone.x + hop.x,
                        y: stone.y + hop.y
                    })) {
 
                    
                    var res = this.createConstructionSite(stone.x + hop.x, stone.y + hop.y,
                        STRUCTURE_EXTENSION);
                    // if (res == ERR_RCL_NOT_ENOUGH){return}
                    dlog('placing extension at ' + (stone.x + hop.x) + ',' + (stone.y + hop.y) + ' result: ' + util.getError(res));
                        
                    switch (res) {
                        case OK:
                            placeNum--;
                            break;
                        case ERR_INVALID_TARGET:
                            break;
                        case ERR_FULL:
                            util.purgeOldConstruction();
                            break;
                        default:
                            this
                                .log('placing extension, result: ' +
                                    util.getError(res))
                    }
                    
                    
                    
                    
                    this.visual.circle(Number(stone.x + hop.x), Number(stone.y + hop.y), {
                        //                         width: 0.2,
                        color: '#22ffff',
                        opacity: 0.7,
                        //     lineStyle: 
                    });
                }
            }
        }
    }

}

// Room.prototype.placeExtensions = function() {
 //    var have = this.find(FIND_MY_STRUCTURES, {
 //        filter: {
 //            structureType: STRUCTURE_EXTENSION
 //        }});

 //    for (var damned in have) {
 //        have[damned].destroy();
 //    }
// }

Room.prototype.placeExtensionsOld = function() {
    // Compare number allowed at this controller level vs. how many in room
    // Should only be called if room level has changed!
    var placeNum = this.needStructure(STRUCTURE_EXTENSION);
    var origin = Game.getObjectById(this.memory.spawnId).pos;

    // make in some checkered pattern around spawn
    //

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    var radius = 2;
    // start at spawn +/- 2 squares
    // spiral out
    while (placeNum > 0 && radius < 10) {
        dance: for (var xdelta = -radius + radius % 2; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, this.name);
                this.log('chck ' + this.checkReserved(site));
                if (this.checkReserved(site)) {
                    var res = this.createConstructionSite(site,
                        STRUCTURE_EXTENSION);
                    // if (res == ERR_RCL_NOT_ENOUGH){return}
                    dlog('placing extension at ' + (origin.x + xdelta) + ',' +
                        (origin.y + ydelta) + ' resut: ' +
                        util.getError(res));
                    switch (res) {
                        case OK:
                            placeNum--;
                            break dance;
                            break;
                        case ERR_INVALID_TARGET:
                            break;
                        case ERR_FULL:
                            util.purgeOldConstruction();
                            break;
                        default:
                            this
                                .log('placing extension, result: ' +
                                    util.getError(res))
                    }
                }
            }
        }
        radius++;
    }
}

Room.prototype.placeContainers = function() {

    var have = this.find(FIND_STRUCTURES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    }).length + this.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: STRUCTURE_CONTAINER
        }
    }).length;
    if ((have == 5) || (have >= Object.keys(this.memory.shafts).length)) {
        return

    } // stagger one per level to spread out construcution

    for (var x in this.memory.shafts) {
        var shaft = this.memory.shafts[x];
        var site = new RoomPosition(shaft.pos.x, shaft.pos.y, this.name);
        var res = this.createConstructionSite(site, STRUCTURE_CONTAINER);
        // dlog('added container: ' + util.getError(res));
    }
}

Room.prototype.placeLinks = function() {

    if (!this.memory.planned) {
        return false
    }

    var linkSet = this.memory.links;

    // Link memory object structure
    //
    // key: game object id,
    // obj{
    // pos: position object,
    // type: prime, source, shuttle

    // this.log('linkset' + linkSet)
    // util.dumpObj(linkSet)
    // refresh list
    for (var linkId in linkSet) {
        var link = linkSet[linkId];
        var linkObj = Game.getObjectById(linkId);

        // this.log('checking ' + linkId)
        if (!util.def(linkObj)) {
            // check if it was a construction site

            var site = new RoomPosition(link.pos.x, link.pos.y,
                link.pos.roomName);
            var sitestuff = site.lookFor(LOOK_STRUCTURES);
            if (!sitestuff.length) {
                var sitestuff = site.lookFor(LOOK_CONSTRUCTION_SITES);
            }

            for (var thing in sitestuff) {
                var newStructure = sitestuff[thing];
                if (newStructure.structureType == STRUCTURE_LINK) {
                    linkSet[newStructure.id] = {
                        pos: newStructure.pos,
                        type: link.type,
                        dir: link.dir,
                        srcId: link.srcId
                    };
                }
            }
            delete linkSet[linkId];
        }
        //    else {
        //    	if (link.type == 'aux' && linkObj.hitsMax) {
        //    		for ( var sr in this.memory.sources) {
        //    			if (this.memory.sources[sr].id == srcId
        //    					&& !this.memory.sources[sr].link) {
        //    				this.memory.sources[sr].link = linkObj.id;
        //    			}
        //    		}
        //    	}
        //    }
    }

    var placeNum = this.needStructure(STRUCTURE_LINK);
    var origin = Game.getObjectById(this.memory.spawnId).pos;

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    if (placeNum == 0) {
        //this.log('decided that I dont want to place anyt links ')
        return false;
    }

    this.placePrimeLink = function() {
        var radius = 3;
        dance: for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, this.name);
                var res = this.createConstructionSite(site, STRUCTURE_LINK);
                if (res == OK) {
                    linkSet[site.x + ',' + site.y] = { // assign it some random
                            // key for now, can't
                            // get game obj id until
                            // next tick becuase
                            // screw you thats why
                            pos: site,
                            type: 'prime',
                            dir: 'source'
                        }
                        // this.memory.primeLinkLoc = site;
                    break dance;
                }
            }
            radius++;

            // epstein failsafe
            if (radius > 10) {
                return false;
            }
        }
    }

    this.placeAuxLink = function() {

        // this.log('placing aux link')

        dance: for (var cand in this.memory.sources) {
            // check if there is already one assigned

            for (var chk in this.memory.links) {
                var chklink = this.memory.links[chk];
                if (chklink.type == 'aux' && chklink.srcId == cand) {
                    this.log(cand + 'already linked');
                    continue dance;
                }
            }


            var srcId = cand;
            break;
        }

        // sanity check

            if (!srcId) {
                this.log('unable to find source with no link')
                return false;
            }

        this.log('linking source ' + cand);

        var thisShaft = Game.getObjectById(srcId);
        // check for defined shafts

        var x = 10,
            rx = thisShaft.pos.x, // W component of current room
            ry = thisShaft.pos.y, // N component of current room
            vector = util.spiral(x);

        // this.log('here ' + vector + ', (' + rx + ',' + ry + ')..')
        // return;
        while (vector[2] <= 2) {
            var nx = +rx + +vector[0],
                ny = +ry + +vector[1];

            vector = util.spiral(++x);

            if (nx <= 0 || nx >= 49) {
                continue;
            }
            if (ny <= 0 || ny >= 49) {
                continue;
            }
            var testSite = {
                x: nx,
                y: ny
            }
            this.log('placing ' + nx + ',' + ny)
            if (this.isAdjacentClear(testSite)) {
                // this.log('sothere')
                var site = new RoomPosition(nx, ny, this.name);
                var res = this.createConstructionSite(site,
                    STRUCTURE_LINK);
                this.log(util.getError(res));
                switch (res) {
                    case OK:
                        this.log('aux placed');
                        linkSet[site.x + ',' + site.y] = { // assign it
                            pos: site,
                            srcId: srcId,
                            dir: 'sink',
                            type: 'aux'
                        }
                        return true;
                        break;
                        // case ERR_FULL: this.log('construction sites number '+ Game.constructionSites.length);
                        break;
                    default:
                        this.log('error placing aux: ' + util.getError(res));
                }
            }
        }
    }

    // Defines strategy for using links in this room
    var linkmode = this.memory.strategy.construction.linkmode;
    if (!util.def(linkmode)) {
        // TODO - come up with long haul shuttle nodes
        linkmode = 'normal';
    }

    switch (linkmode) {
        case 'normal':
            // this.log('link normal ')
            var typecount = {};

            for (var l in linkSet) {
                var thisLink = linkSet[l];
                var thisLinktype = thisLink.type;
                typecount[thisLinktype] = (typecount[thisLinktype]) ? typecount[thisLinktype] + 1 : 1;
            }


            if (!typecount['prime']) {
                return this.placePrimeLink();
            }

            if (!typecount['aux'] || typecount['aux'] < Object.keys(this.memory.sources).length) {
                return this.placeAuxLink();
            }

            // this.log('link code - nothing more to do here');
            return true;
            break;
            // this.log('link code')

        default:
            this.log('oh...boy. link code mess up big time yo');
    }

    // Two link strategies possible, in room mining, and across room pipelining
    // if this.memory.strategy)

    // this.log('link code')
}

Room.prototype.placeSpawn = function() {

    if (!this.controller || !this.controller.my || !this.controller.level) {
        return false;
    }

    // var buildstatus = this.memory.cache.construction;
    //
    // if (buildstatus&& buildstatus[this.name].spawn) {
    // // Alread building. let's keeps it going
    //
    // var counter = 0;
    // for (var drones in buildstatus[this.name].spawn) {
    // if (!Game.creeps[buildstatus[this.name].spawn[drones]]) {
    // delete buildstatus[this.name].spawn[drones];
    // }
    // }
    //
    //
    // return;
    // }
    //
    // for (var poor in Game.creeps) {
    // var soul = Game.creeps[poor];
    // if (soul.taskState != "SPECIAL") {
    // dlog('ackkkk bad boy')
    // //Game.creeps[poor].focusBuild("dc284fb70fd9707");
    // }
    // }

    var placeNum = this.needStructure(STRUCTURE_SPAWN);

    if (placeNum == 0) {
        return;
    }

    // if (util.def(this.memory.spawnId) &&
    // Game.getObjectById(this.memory.spawnId)) {
    // 
    // }
    this.log('called spawn placer, need is ' + placeNum);

    var ctrlPos = this.controller.pos;
    var clstSrc = ctrlPos.findClosestByRange(FIND_SOURCES);
    var kingsRoad = ctrlPos.findPathTo(clstSrc);
    var midpoint = kingsRoad[Math.floor(kingsRoad.length / 2)];

    var counter = 0;
    var start = 5;
    while (start < kingsRoad.length - 5) {
        var testSq = new RoomPosition(kingsRoad[start].x, kingsRoad[start].y,
            this.name);
        // this.createFlag(testSq, 'spawnLoc' + counter, COLOR_RED,
        // COLOR_WHITE);
        counter++;

        if (this.isAdjacentClear(testSq)) {
            var res = testSq.createConstructionSite(STRUCTURE_SPAWN);
            dlog('create spawn result is ' + util.getError(res))
            return true;
        }
        start++;
    }
    return false;
}

Room.prototype.isAdjacentClear = function(pos) {

    var x = (pos.x < 2) ? 2 : (pos.x > 47) ? 47 : pos.x;
    var y = (pos.y < 2) ? 2 : (pos.y > 47) ? 47 : pos.y;

    var surroundings = [Game.map.getTerrainAt(x - 1, y - 1, this.name),
        Game.map.getTerrainAt(x, y - 1, this.name),
        Game.map.getTerrainAt(x + 1, y - 1, this.name),

        Game.map.getTerrainAt(x - 1, y, this.name),
        Game.map.getTerrainAt(x, y, this.name),
        Game.map.getTerrainAt(x + 1, y, this.name),

        Game.map.getTerrainAt(x - 1, y + 1, this.name),
        Game.map.getTerrainAt(x, y + 1, this.name),
        Game.map.getTerrainAt(x + 1, y + 1, this.name)
    ];

    for (var sq in surroundings) {
        if (surroundings[sq] == 'wall') {
            return false
        }
    }
    return true;
}

module.exports.bd = placeDefenses;

function dlog(msg) {
    util.dlog('PLACEMENT', msg);
}
