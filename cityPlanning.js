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

module.exports.lvl2 = function(room) {

}

// function validRoadTile(pos) {
// var map = room.memory.map;
// var tile = [ pos.y ][pos.x];
//
// for ( var entry in tile) {
// var data = tile[entry];
//
// }
// }
function surveyRoom(room) {
	var map = room.lookAtArea(0, 0, 49, 49);
	room.memory.map = map
	room.memory.numExts = 0
	var mem = room.memory // assign it the object instead of the counter
	// value so it is referenced

	// Wipe the slate
	mem.sources = []
	mem.paths = []

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
				// if it's a source, add it to the list of sources
				if (hereIs.type == 'source') {
					mem.sources.push(hereIs.source)
				}
			}
		}
	}
	flagRoads(room)
}

module.exports.surveyRoom = surveyRoom

module.exports.designRoom = function(room) {
	// spawn is the sensible hub of activity
	// 

	// Priorities 1, extensions, 2, ramparts around base perimeter, and 3)
	// walls
	// around exits

	// Pre-compute a list of paths in the room to save on cpu every tick

	// //////////////
	// Sanity Checks

	if (!util.def(room.memory.map)) {
		room.memory.map = room.lookAtArea(0, 0, 49, 49);
		flagRoads(room) // lay down basic tiles we want to make available for
		// roads
	} else {
		var map = room.memory.map; // We are only interested in non-movable
		// objects currently. Will need to
		// periodically refresh for evaluating
		// walls/creep locations
	}
	if (!util.def(room.memory.paths)) {
		room.memory.paths = []

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

var limits = [ {
	"extensions" : 0,
	"spawns" : 1,
	"links" : 0
}, {
	"extensions" : 5,
	"spawns" : 1,
	"links" : 0
}, {
	"extensions" : 10,
	"spawns" : 1,
	"links" : 0
}, {
	"extensions" : 20,
	"spawns" : 1,
	"links" : 0
}, {
	"extensions" : 30,
	"spawns" : 1,
	"links" : 2
}, {
	"extensions" : 40,
	"spawns" : 1,
	"links" : 3
}, {
	"extensions" : 50,
	"spawns" : 2,
	"links" : 4
}, {
	"extensions" : 200,
	"spawns" : 3,
	"links" : 5
}

]

var cupidShuffle = {
	1 : {
		"x" : 0,
		"y" : -1
	},
	2 : {
		"x" : 1,
		"y" : -1
	},
	3 : {
		"x" : 1,
		"y" : 0
	},
	4 : {
		"x" : 1,
		"y" : 1
	},
	5 : {
		"x" : 0,
		"y" : 1
	},
	6 : {
		"x" : -1,
		"y" : 1
	},
	7 : {
		"x" : -1,
		"y" : 0
	},
	8 : {
		"x" : -1,
		"y" : -1
	}
}

function allRoadsLeadToRome(curpos, curlen, target, room) {
	var x = curpos.x;
	var y = curpos.y;
	var map = room.memory.map; // should be a 2 dim array of positions with
	// list of objects at each pos
	var curLoc = map[y][x]; // careful now. map is row, column
	//
	// // curpos.createFlag(+curlen + ' ' + curpos.x + ',' + curpos.y,
	// // COLOR_BROWN);
	// dlog('depth: ' + curlen)
	// util.dumpObject(curLoc);

	// insert all adjacent check here?
	//

	if (util.def(curLoc.pathLength) && (curLoc.pathLength != curlen - 1)) {
		if ((curlen > 1)) {
			// dlog('adjacent')
			// curpos.createFlag(+curlen + ' ' + curpos.x + ',' + curpos.y,
			// COLOR_YELLOW);
			return {
				"result" : 'adjacent'
			}
		}

	}

	// have we been here before
	if (curLoc.explored || curLoc.pathLength) {
		return {
			"result" : "fail"
		}
	}

	// Have we arrived?
	if ((curpos.x == target.x) && (curpos.y == target.y)) {
		// dlog('huzzah! path found');
		var result = {
			"result" : 'success',
			"length" : 1,
			"path" : []
		}
		result.path.push(curpos); // include final tile?
		return result;
	} // Success

	// Not there yet, test current tile if it's not the starting point
	if (curlen) {
		for ( var i in curLoc) {
			var hereIs = curLoc[i];
			if (hereIs.type == 'structure') { // can't build through existing
				// structures
				// dlog('structure present, rerouting');
				// curpos.createFlag('Structure ' + curpos.x + ',' + curpos.y,
				// COLOR_ORANGE);
				curLoc.explored = 1;
				return {
					"result" : "fail"
				}
			} else if (hereIs.type == 'terrain') {
				if (hereIs.terrain == 'wall') {
					// curpos.createFlag('Wall ' + curpos.x + ',' + curpos.y,
					// COLOR_RED);
					// dlog('hit a wall, rerouting');
					curLoc.explored = 1;
					return {
						"result" : "fail"
					}
				}
			}
		}
	}
	// var tail
	// var neighborCount = 0
	// // Check if we are backtracking
	// for ( var hop in cupidShuffle) {
	// var scotch = cupidShuffle[hop]
	//
	// var expX = x + scotch.x
	// var expY = y + scotch.y
	//
	// // dlog('looking at ' + expX + ',' + expY)
	// if (util.def(map[expY][expX]) && map[expY][expX].pathLength) {
	// // dlog('alredy in path ' + expX + ',' + expY + ' ' + neighborCount)
	// if (map[expY][expX].pathLength == curlen - 1) {
	// tail = {
	// 'x' : expX,
	// 'y' : expY
	// } // Likely where we just came
	// }
	// // from
	// neighborCount++
	// }
	//
	// if ((neighborCount > 1) // If we have wrapped around, or if we try
	// // to go backwards
	// ) {
	// // curpos.createFlag('wrapped ' + x + ',' + y, COLOR_RED);
	//
	// // dlog('were surrounded')
	// // burn the evidence and gtfo
	// delete (curLoc.pathLength)
	// return {
	// "result" : "adjacent"
	// }
	//
	// }
	//
	// }
	// Okay well, seems we are either plain terrain or swamp
	// We can work with that, lets see where it goes
	curLoc.pathLength = curlen; // mark how long it took to get here

	// curpos.createFlag('Explored ' + curpos.x + ',' + curpos.y, COLOR_RED);
	// try to move towards the target first
	var dir = curpos.getDirectionTo(target);

	// 8 1 2
	// 7 * 3
	// 6 5 4

	// bounds checking and direction translation
	function step(dir, pos) {
		if (dir < 1) {
			dir = dir + 8;
		}
		if (dir > 8) {
			dir = dir - 8;
		}

		var newcord = {
			'x' : cupidShuffle[dir].x + pos.x,
			'y' : cupidShuffle[dir].y + pos.y
		}

		if (((newcord.x > 49) || (newcord.x < 0))
				|| ((newcord.y > 49) || (newcord.y < 0))) {
			return null
		} else {
			return new RoomPosition(newcord.x, newcord.y, pos.roomName)
		}
		//
		// switch (dir) {
		// case 1:
		// if (pos.y == 0) {
		// return null;
		// }
		// return new RoomPosition(pos.x, pos.y - 1, room.name);
		// case 2:
		// if ((pos.y == 0) || (pos.x == 49)) {
		// return null;
		// }
		// // check corner cases (hehe) - path can cross itself at angles
		// if (map[y - 1][x].explored && map[y][x + 1].explored) {
		// return null
		// }
		// return new RoomPosition(pos.x + 1, pos.y - 1, room.name);
		// case 3:
		// if (pos.x == 49) {
		// return null;
		// }
		// return new RoomPosition(pos.x + 1, pos.y, room.name);
		// case 4:
		// if ((pos.y == 49) || (pos.x == 49)) {
		// return null;
		// }
		// if (map[y][x + 1].explored && map[y + 1][x].explored) {
		// return null
		// }
		// return new RoomPosition(pos.x + 1, pos.y + 1, room.name);
		// case 5:
		// if ((pos.y == 49)) {
		// return null;
		// }
		// return new RoomPosition(pos.x, pos.y + 1, room.name);
		// case 6:
		// if ((pos.x == 0) || (pos.y == 49)) {
		// return null;
		// }
		// if (map[y][x - 1].explored && map[y + 1][x].explored) {
		// return null
		// }
		// return new RoomPosition(pos.x - 1, pos.y + 1, room.name);
		// case 7:
		// if ((pos.x == 0)) {
		// return null;
		// }
		// return new RoomPosition(pos.x - 1, pos.y, room.name);
		// case 8:
		// if ((pos.x == 0) || (pos.y == 0)) {
		// return null;
		// }
		// if (map[y][x - 1].explored && map[y - 1][x].explored) {
		// return null
		// }
		// return new RoomPosition(pos.x - 1, pos.y - 1, room.name);
		// }
	}

	// starting with dir, try dir, then try left of dir, then right of dir, then
	// left left of dir, etc. But don't test all of them! if you go backwards it
	// will never end
	var verdict = {
		"result" : "fail"
	};
	for (var i = 0; i < 5; i++) {

		// step toward target
		var nextTile = step(dir - i, curpos);
		if (util.def(nextTile)) { // not going off the edge of the world
			verdict = allRoadsLeadToRome(nextTile, curlen + 1, target, room);
			// Down
			// the
			// rabbit
			// hole
			// we
			// go
		}
		if (verdict.result == 'success') {
			// dlog('good path found, passing up the chain');
			verdict.path.push(curpos);
			return {
				"result" : 'success',
				"length" : verdict.length + 1,
				"path" : verdict.path
			};
		} else if (verdict.result == 'adjacent') {

			delete (map[nextTile.y][nextTile.x].pathLength)
			return {
				"result" : "fail"
			}
		}

		nextTile = step(dir + i, curpos);

		if (util.def(nextTile)) {
			verdict = allRoadsLeadToRome(nextTile, curlen + 1, target, room);
		}
		if (verdict.result == 'success') {
			verdict.path.push(curpos);

			return {
				"result" : 'success',
				"length" : verdict.length + 1,
				"path" : verdict.path
			};
		} else if (verdict.result == 'adjacent') {
			delete (map[nextTile.y][nextTile.x].pathLength)

			return {
				"result" : "fail"
			}
		}

	}

	// If we are here, none of the adjacent tiles go anywhere. mark tile as
	// explored and report failure
	curLoc.explored = 1;
	// curpos.createFlag('Explored ' + curpos.x + ',' + curpos.y, COLOR_WHITE);

	return {
		"result" : "fail"
	}
	// function allRoadsLeadToRome(curpos, lastpos, curlen, target) {
	//
	// // return object with following format
	//
	// // { "result": success or fail,
	// // "path": [],
	// // pathLen: num
	// // }
	// test north west
	// test west
	// test south west
	// test south
	// test south east
	// test east
	// test north east

}

function flagRoads(room) { // useful for visualizing structure placement
	// and pathing code
	// dlog('called')
	var spawns = room.find(FIND_MY_SPAWNS);
	var sources = room.memory.sources;

	var sourcePaths = []
	if (spawns.length) {
		spawns.forEach(function(spawn) {
			// sources.forEach(function(source) {
			for ( var id in sources) {
				// dlog('testing sourcd ' + id)
				var source = sources[id]
				// Calculate path both from and to target, select which
				// one is
				// shorter
				var path = reservePath(spawn.pos, source.pos, room)
				var htap = reservePath(source.pos, spawn.pos, room)
				// var builtin = spawn.pos.findPathTo(source);
				// var builtout = source.pos.findPathTo(spawn);

				// for ( var tile in builtin) {
				// var roompos = new RoomPosition(builtin[tile].x,
				// builtin[tile].y, 'sim');
				// roompos.createFlag(tile + 'f* ' + id, COLOR_BLUE);
				// }
				//
				// for ( var tile in builtout) {
				// var roompos = new RoomPosition(builtout[tile].x,
				// builtout[tile].y, 'sim');
				// roompos.createFlag(tile + 'h* ' + id, COLOR_PURPLE);
				// }

				// for ( var tile in path) {
				// var roompos = path[tile];
				// roompos.createFlag(tile + 'f ' + id, COLOR_WHITE);
				// }
				// for ( var tile in htap) {
				// var roompos = htap[tile];
				// roompos.createFlag(tile + 'h ' + id, COLOR_ORANGE);
				// }

				//

				var shortest
				if (util.def(path) && util.def(htap)) {
					shortest = (path.length <= htap.length) ? path : htap
							.reverse(); // Paths should be added
					// so the last step is
					// the spawn(s)
				} else if (util.def(htap)) {
					shortest = htap.reverse()
				} else if (util.def(path)) {
					shortest = path
				} else {
					dlog('Path not found!')
				}

				// dlog('path legnth ' + path.length)
				for ( var tile in shortest) {
					var roompos = shortest[tile];
					room.memory.map[roompos.y][roompos.x].push({
						"type" : "metadata",
						"isReserved" : true
					})
					if (debug) {

						roompos.createFlag(tile + '-' + id, COLOR_GREEN);
					} else {
						roompos.createConstructionSite(STRUCTURE_ROAD)
					}
				}
				sourcePaths.push(shortest)
			}

			var contr = room.controller;
			if (util.def(contr)) {
				path = reservePath(spawn.pos, contr.pos, room)
				htap = reservePath(contr.pos, spawn.pos, room)
				if (util.def(path) && util.def(htap)) {
					var shortest = (path.length < htap.length) ? path : htap
							.reverse();
					room.memory.paths.controller = shortest
					// dlog('path legnth ' + path.length)
					for ( var tile in shortest) {
						var roompos = shortest[tile];
						room.memory.map[roompos.y][roompos.x].push({
							"type" : "metadata",
							"isReserved" : true
						})
						if (debug) {
							roompos.createFlag(tile + '-' + '', COLOR_GREEN);
						} else {
							roompos.createConstructionSite(STRUCTURE_ROAD)
						}
					}
				}
			}
		})
		// })
	}

	// Sort sources by distance from spawn
	sourcePaths.sort(function(a, b) {
		return (a.length - b.length)
	})
	room.memory.paths.sources = sourcePaths
}

// from and to are roomposition type
function reservePath(from, to, room) {

	if (!util.def(from) || !util.def(to)) {
		return null;
	}
	// setup the search space, call recursive search function, and process the
	// result
	// 
	if (from.roomName != to.roomName) {
		return null;
	}

	var map = room.memory.map;

	// clear search space
	for (var x = 0; x < 50; x++) {
		for (var y = 0; y < 50; y++) {
			delete (map[x][y].explored)
			delete (map[x][y].pathLength);
		}
	}
	var path = allRoadsLeadToRome(from, 0, to, room);
	return path.path;
}

function findFreeAdjacent(pos, room) { // Passes RoomPosition object
	debugger
	for ( var td in cupidShuffle) {
		var shift = cupidShuffle[td]
		var sidestep = {
			'x' : pos.x + shift.x,
			'y' : pos.y + shift.y
		}

		if (((sidestep.x > 49) || (sidestep.x < 0))
				|| ((sidestep.y > 49) || (sidestep.y < 0))) {
			return null
		}

		var map = room.memory.map
		var memloc = map[sidestep.y][sidestep.x]

		for ( var data in memloc) {
			var datum = memloc[data]
			if (util.def(datum.type)) {

				if (datum.type == 'metadata') {
					if (datum.isReserved === true) {
						continue
					}
				}
				if (datum.type == 'source') {
					continue
				}
				if (datum.type == 'terrain') {
					if (datum.terrain != 'plain') {
						continue
					}
				}
				if ((datum.type == 'constructionSite')
						|| (datum.type == 'structure')) {
					continue
				}

				return new RoomPosition(sidestep.x, sidestep.y, room.name)
			}
		}
	}
	return null
}

function placeExtensions(room) {

	var cap = limits[room.getLevel() - 1].extensions // remember arrays start
	// at
	// index zero
	dlog('I can build ' + cap + ' extensions at the current level')

	// fill up the sides of the shortest path first, then next shortest, etc.
	for ( var src in room.memory.paths.sources) {
		if (room.memory.numExts >= cap) { // debug. really should be equal to
			break
		}
		dlog('There are currently ' + room.memory.numExts
				+ ' extensions present. Placing...')

		// Start at the source and work towards the spawn
		var srcPath = room.memory.paths.sources[src]
		for (var tempT = 2; tempT < srcPath.length; tempT++) {
			// don't want to start on the source itself
			debugger
			var okayTile = findFreeAdjacent(srcPath[tempT], room)
			// look around the road for a place to put the extension
			if (util.def(okayTile)) {
				dlog('szzoodwwwnwn ' + okayTile.x + ',' + okayTile.y)
				debugger
				var res = okayTile.createConstructionSite('extension')
				if (!res) {
					dlog('great success')
					room.memory.numExts++
					var maploc = room.memory.map[okayTile.y][okayTile.x]
					if (util.def(maploc.metadata)) {
						maploc.metadata.isReserved = true
					} else {
						maploc.metadata = {
							'isReserved' : true
						}
						break;
					}
				} else {
					dlog('Error ' + res)
				}
			}
		}
	}

	// Should place around storage as much as possible, otherwise closest to
	// source

	// var sp = room.find(FIND_MY_SPAWNS);
	// sp.forEach(function(spok) {
	//
	// var test = room.lookForAt('terrain', spok);
	// util.dumpObject(test);
	// });

	//	
	// // room.memory.UUT = test;
	// for ( var tile in test) {
	// var row = test[tile];
	// for ( var col in row) {
	// var object = row[col];
	// for ( var dun in object) {
	// util.dumpObject(object[dun]);
	//
	// }
	// }
	// }

}

function dlog(msg) {
	util.dlog('PLACEMENT', msg);
}
