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


Room.prototype.schemaCheck = function() {
    this.memory.cache = this.memory.cache || {};
    this.memory.cache.construction = this.memory.cache.construction || {};

    this.memory.trafficMap = this.memory.trafficMap || {};
    this.memory.infrastructure = this.memory.infrastructure || {};
    // this.memory.links = this.memory.links || {};

    if (!this.memory.links) {
        this.log('finding and destroying all links present because i forgot i had any')
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

    // this.log(
    var maxBuild = 5;

    if (this.memory.strategy && this.memory.strategy.construction) {
        maxBuild = this.memory.strategy.construction.maxBuildSites;
    }

    var have = this.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: {
            structureType: STRUCTURE_ROAD
        }
    }).length;

    if (have >= maxBuild) {
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
                var res = this.createConstructionSite(st.x, st.y, STRUCTURE_ROAD);
                if (!res) {
                    have++;
                }
            }
        }
    }

    // Taken care of explicit paths
    // start at the top and look for any tile that has high traffic

    //this.log('scoring traffic for road building');
    var map = this.memory.trafficMap;

    // Remember we can't build roads on the first or last tile (exits)
    for (var x = 1; x < 49; x++) {
        if (!util.def(map[x])) {
            map[x] = {};
        }

        for (var y = 1; y < 49; y++) {

            if (!util.def(map[x][y])) {
                map[x][y] = {
                    heat: 0,
                    refreshed: 0
                }
            }
            var thisSpot = map[x][y];

            thisSpot.heat = thisSpot.heat - (Game.time - thisSpot.refreshed);
            thisSpot.heat = (thisSpot.heat < 0) ? 0 : thisSpot.heat;
            thisSpot.refreshed = Game.time;
            if (thisSpot.heat > 25) {
                if (have >= maxBuild) {
                    return true;
                }; // Let's not get carried away
                var res = this.createConstructionSite(x, y, STRUCTURE_ROAD);
                if (!res) {
                    have++;
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
        this.memory.infrastructure.exitDoors.side = (Math.floor((end - start) / 2) + start);
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
    var x = (pos.x < 1) ? 1 : (pos.x > 48) ? 48 :
        pos.x;
    var y = (pos.y < 1) ? 1 : (pos.y > 48) ? 48 :
        pos.y;
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

Room.prototype.createBasicPaths = function() {

        // Go ahead and create roads to controller and sources from spawn

        var spwn = Game.getObjectById(this.memory.spawnId);
        var shafts = this.memory.shafts;
        this.memory.infrastructure.paths = {};
        this.memory.infrastructure.paths.ctrl = this.controller.pos.findPathTo(spwn);

        // Create roads to mineshafts
        for (var sh in shafts) {
            this.memory.infrastructure.paths['shaft' + sh] = this.findPath(spwn.pos,
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

    // Order array by name in case there is more than one spawn. we want the original
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

    //if (!(Game.time % 17)) {
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
    while (placeNum > 0) {
        for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y +
                    ydelta, this.name);
                var res = this.createConstructionSite(site, STRUCTURE_TOWER);
                if (res == OK) {
                    placeNum--;;
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
    //  run through known reserved spots 


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
    while (placeNum > 0) {
        for (var xdelta = -radius + radius % 2; xdelta <= radius; xdelta += 2) {
            for (var ydelta = -radius + radius % 2; ydelta <= radius; ydelta += 2) {
                var site = new RoomPosition(origin.x + xdelta, origin.y + ydelta, this.name);
                this.log('chck ' + this.checkReserved(site));
                if (this.checkReserved(site)) {
                    var res = this.createConstructionSite(site, STRUCTURE_EXTENSION);
                    // if (res == ERR_RCL_NOT_ENOUGH){return}
                    dlog('placing extension at ' + (origin.x + xdelta) + ',' + (origin.y + ydelta) + ' resut: ' + util.getError(res));
                    if (res == OK) {
                        placeNum--;
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
    var placeNum = this.needStructure(STRUCTURE_LINK);
    var origin = Game.getObjectById(this.memory.spawnId).pos;

    if (!util.def(origin)) {
        dlog('big bad voodoo');
        return false;
    }

    if (placeNum == 0) {
        this.log('decided that I dont want to place anyt links ')
            /// return false;
    }

    var linkSet = this.memory.links;


    // Link memory object structure
    //
    // key: game object id,
    // obj{
    // pos: position object,
    // type: prime, source, shuttle

    this.log('hmm' + linkSet)
        // refresh list 
    for (var linkId in linkSet) {
        var link = linkSet[linkId];

        this.log('checking ' + linkId)
        if (!util.def(linkId) || !util.def(Game.getObjectById(linkId))) {
            // check if it was a construction site 

            this.log(linkId + ' is not valid')
            util.dumpObj(link)

            var site = new RoomPosition(link.pos.x, link.pos.y, link.pos.roomName);
            var sitestuff = site.lookFor(LOOK_STRUCTURES);
            if (!sitestuff.length) {
                var sitestuff = site.lookFor(LOOK_CONSTRUCTION_SITES);
            }
            this.log('stuff is ');
            for (var thing in sitestuff) {
                var newStructure = sitestuff[thing];
                if (newStructure.structureType == STRUCTURE_LINK) {
                    linkSet[newStructure.id] = {
                        pos: newStructure.pos,
                        type: link.type
                    };
                }
            }
            delete linkSet[linkId];
        }
    }

    this.placePrimeLink = function() {
        var radius = 3;
        dance:
            for (var xdelta = -radius + radius % 2 + 1; xdelta <= radius; xdelta += 2) {
                for (var ydelta = -radius + radius % 2 + 1; ydelta <= radius; ydelta += 2) {
                    var site = new RoomPosition(origin.x + xdelta, origin.y + ydelta, this.name);
                    var res = this.createConstructionSite(site, STRUCTURE_LINK);
                    if (res == OK) {
                        var newSite = site.lookFor(LOOK_CONSTRUCTION_SITES);
                        this.log('newsite:')
                        util.dumpObj(newSite);

                        linkSet[util.getRand(1, 5)] = { // assign it some random key for now, can't get game obj id until next tick becuase screw you thats why
                                pos: site,
                                type: 'prime'
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

    this.placeAuxLink = function(srcId) {
        //

        if (!srcId) {
            if (!this.memory.sources) {
                return false;
            }

        }
        //
        //
        //
        // lookforatarea look constant   LOOK_TERRAIN
        var source = Game.getObjectById(srcId);

        if (!source) {
            this.log('aux link error place');
            return false
        }
        //		var epicenter = source.pos;
        var bounds = util.bound(source.pos, 2);
        dlog('----')
        util.dumpObj(bounds)
        var sourceMap = source.room.lookForAt(LOOK_TERRAIN, bounds.top, bounds.left, bounds.bottom, bounds.right);
        util.dumpObj(sourceMap);
        dlog('ooooo')
    }

    // Defines strategy for using links in this room
    var linkmode = this.memory.strategy.construction.linkmode;
    if (!util.def(linkmode)) {
        //TODO - come up with long haul shuttle nodes
        linkmode = 'normal';
    }

    switch (linkmode) {
        case 'normal':

            var haveprime = false;
            var haveaux = 0;

            for (var node in linkSet) {
                if (linkSet[node].type == 'prime') {
                    haveprime = true;
                    continue;
                }
                if (linkSet[node].type == 'aux') {
                    haveaux++;
                }
            }

            if (!haveprime) {
                return this.placePrimeLink();
            }

            if (!util.def(this.memory.sources)) {
                this.log('cant place aux sources, no sources in memory');
                return false;
            }

            var numsources = this.memory.sources.length;

            if (haveaux < numsources) {
                // Check for existing
                for (var n in this.memory.sources) {
                    var disrc = this.memory.sources[n];

                    for (var m in this.memory.shafts) {}
                }
                if (this.memory.sources.length > 1) {
                    for (var src in this.memory.sources) {
                        var asrc = this.memory.sources[src];
                        if (!util.def(asrc.linkId)) {
                            var res = this.placeAuxLink(asrc);
                            if (res) {
                                placeNum--;
                            }
                        }
                    }

                    if (placeNum > 0) {
                        for (var src in this.memory.sources) {
                            var asrc = this.memory.sources[src];
                            if (!util.def(asrc.linkId)) {
                                var res = this.placeAuxLink(asrc);
                                if (res) {
                                    asrc.linkId = asrc.id;
                                    placeNum--;
                                }
                            }
                        }
                    }
                }
            }
            this.log('link code - nothing more to do here');
            return true;
            break;
            this.log('link code')

        default:
            this.log('oh...boy. link code mess up big time yo');
    }




    // Two link strategies possible, in room mining, and across room pipelining
    //  if this.memory.strategy)

    this.log('link code')
    return;

    // Start sanity checks
    //
    // Is there a prime node
    if (util.def(this.memory.primeLinkId)) {

        //   primeLink)) {
        // No Prime Link
        // Is it placed but not built yet?

        if (util.def(this.memory.primeLinkLoc)) {
            // At least it's been tried, let's see if it's still there

            var bud = this.lookForAt(LOOK_CONSTRUCTION_SITES, this.memory.primeLinkLoc.x, this.memory.primeLinkLoc.y);
            for (var hmm in bud) {
                var derp = bud[hmm];
                if (derp.structureType == STRUCTURE_LINK) {
                    // prime link placed, just not built yet
                    primeLink = 'building';
                }
            }

            if (primeLink != 'building') {

                // Maybe it was building and is done now - 
                var bud = this.lookForAt(LOOK_STRUCTURES, this.memory.primeLinkLoc.x, this.memory.primeLinkLoc.y);

                for (var hmm in bud) {
                    var derp = bud[hmm];
                    if (derp.structureType == STRUCTURE_LINK) {
                        // prime link placed, just not built yet
                        this.memory.primeLinkId = derp.id;
                        primeLink = derp;
                    }
                }
            }
            if (!util.def(primeLink)) {
                dlog('Error placing prime link in ' + this.name);
            }
        } else {
            // prime link has not been placed. Go forth and do good things.
            if (!this.placePrimeLink()) {
                dlog('Error placing prime link in ' + this.name);
                return false;
            }
        }
    }


    // So - have a prime link, and some I can place. Should be one per source. 


    // Enumerate sources in room




    // Want to place it within reach of a miner, so behind a mineshaft, but leave room for pathing
}


Room.prototype.placeSpawn = function() {

    if (!this.controller || !this.controller.level) {
        return false;
    }

    var buildstatus = this.memory.cache.construction;
    if (!util.def(buildstatus)) {
        buildstatus = {};
    }

    if (buildstatus[this.name] && buildstatus[this.name].spawn) {
        // Alread building. let's keeps it going 

        var counter = 0;
        for (var drones in buildstatus[this.name].spawn) {
            if (!Game.creeps[buildstatus[this.name].spawn[drones]]) {
                delete buildstatus[this.name].spawn[drones];
            }
        }


        return;
    }

    for (var poor in Game.creeps) {
        var soul = Game.creeps[poor];
        if (soul.taskState != "SPECIAL") {
            Game.creeps[poor].focusBuild("dc284fb70fd9707");
        }
    }

    var placeNum = this.needStructure(STRUCTURE_SPAWN);

    if (placeNum == 0) {
        return;
    }

    // if (util.def(this.memory.spawnId) && Game.getObjectById(this.memory.spawnId)) {
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
        var testSq = new RoomPosition(kingsRoad[start].x, kingsRoad[start].y, this.name);
        //    this.createFlag(testSq, 'spawnLoc' + counter, COLOR_RED, COLOR_WHITE);
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

    var x = (pos.x < 2) ? 2 : (pos.x > 47) ? 47 :
        pos.x;
    var y = (pos.y < 2) ? 2 : (pos.y > 47) ? 47 :
        pos.y;

    var surroundings = [
        Game.map.getTerrainAt(x - 1, y - 1, this.name),
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
