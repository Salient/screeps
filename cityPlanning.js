/**
 * 
 */
var util = require('common');

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

// FYI, max call stack size is 4500

module.exports.lvl2 = function(room) {
	// New structures available are extensions, walls, and ramparts.

	// Priorities 1, extensions, 2, ramparts around base perimeter, and 3)
	// walls
	// around exits

	if (!util.def(room.memory.map)) {
		room.memory.map = room.lookAtArea(0, 0, 49, 49);
	} else {
		var map = room.memory.map; // We are only interested in non-movable
		// objects currently. Will need to
		// periodically refresh for evaluating
		// walls/creep locations
	}

	//	
	flagRoads(room); // Can't build roads at level 2, but we want to reserve
	// // the optimal paths for them
	// placeExtensions(room);
}

function validRoadTile(pos) {
	var map = room.memory.map;
	var tile = [ pos.y ][pos.x];

	for ( var entry in tile) {
		var data = tile[entry];

	}
}
function allRoadsLeadToRome(curpos, lastpos, curlen, target, room) {

	// return object with following format

	// { "result": success or fail,
	// "path": [],
	// pathLen: num
	// }

	var x = curpos.x;
	var y = curpos.y;
	var map = room.memory.map; // should be a 2 dim array of positions with
	// list of objects at each pos
	var curLoc = map[x][y];
	dlog('Testing tile (' + x + ',' + y + ')');

	// have we been here before
	if (map[x][y].explored) {
		dlog('wait, tested this one before, skipping');
		return {
			"result" : "fail"
		}
	}

	// Have we arrived?
	if ((curpos.x == target.x) && (curpos.y == target.y)) {
		dlog('huzzah! path found');
		var result = {
			"result" : 'success',
			"length" : 0,
			"path" : []
		}
		result.path.push(curpos); // include final tile?
		return result;
	} // Success

	// Not there yet, test current tile
	for ( var i in curLoc) {
		var hereIs = curLoc[i];
		if (hereIs.type == 'structure') { // can't build through existing
			// structures
			dlog('structure present, rerouting');
			map[x][y].explored = 1;
			return {
				"result" : "fail"
			}
		} else if (hereIs.type == 'terrain') {
			if (hereIs.terrain == 'wall') {

				dlog('hit a wall, rerouting');
				map[x][y].explored = 1;
				return {
					"result" : "fail"
				}
			}
		}
	}

	// Okay well, seems we are either plain terrain or swamp
	// We can work with that, lets see where it goes

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
		switch (dir) {
		case 1:
			if (pos.y == 0) {
				return null;
			}
			return new RoomPosition(pos.x, pos.y - 1, room.name);
		case 2:
			if ((pos.y == 0) || (pos.x == 49)) {
				return null;
			}
			return new RoomPosition(pos.x + 1, pos.y - 1, room.name);
		case 3:
			if (pos.x == 49) {
				return null;
			}
			return new RoomPosition(pos.x + 1, pos.y, room.name);
		case 4:
			if ((pos.y == 49) || (pos.x == 49)) {
				return null;
			}
			return new RoomPosition(pos.x + 1, pos.y + 1, room.name);
		case 5:
			if ((pos.y == 49)) {
				return null;
			}
			return new RoomPosition(pos.x, pos.y + 1, room.name);
		case 6:
			if ((pos.x == 0) || (pos.y == 49)) {
				return null;
			}
			return new RoomPosition(pos.x - 1, pos.y + 1, room.name);
		case 7:
			if ((pos.x == 0)) {
				return null;
			}
			return new RoomPosition(pos.x - 1, pos.y, room.name);
		case 8:
			if ((pos.x == 0) || (pos.y == 0)) {
				return null;
			}
			return new RoomPosition(pos.x - 1, pos.y - 1, room.name);
		}

	}

	// starting with dir, try dir, then try left of dir, then right of dir, then
	// left left of dir, etc.
	var verdict;
	for (var x = 0; x < 4; x++) {

		// step toward target
		var nextTile = step(dir + x, curpos);

		if ((nextTile.x == lastpos.x) && (nextTile.y == lastpos.y)) {
			nextTile = null;
		}

		if (util.def(nextTile)) { // not going off the edge of the world
			verdict = allRoadsLeadToRome(nextTile, curpos, curlen + 1, target,
					room);
			// Down
			// the
			// rabbit
			// hole
			// we
			// go
		}
		if (verdict.result == 'success') {
			dlog('good path found, passing up the chain');

			verdict.path.push(curpos);

			return {
				"result" : 'success',
				"length" : verdict.length + 1,
				"path" : verdict.path
			};
		}

		nextTile = step(dir - x, curpos);

		if ((nextTile.x == lastpos.x) && (nextTile.y == lastpos.y)) {
			nextTile = null;
		}

		if (util.def(nextTile)) {
			verdict = allRoadsLeadToRome(nextTile, curpos, curlen + 1, target,
					room);
		}
		if (verdict.result == 'success') {
			dlog('good path found, passing up the chain');

			verdict.path.push(curpos);

			return {
				"result" : 'success',
				"length" : verdict.length + 1,
				"path" : verdict.path
			};
		}

	}

	// If we are here, none of the adjacent tiles go anywhere. mark tile as
	// explored and report failure
	map[x][y].explored = 1;
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

	var from = new RoomPosition(30, 24, room.name);
	var to = new RoomPosition(22, 15, room.name);
	var what = reservePath(from, to, room);
	dlog('wwwwwwoooonnnkk');
	util.dumpObject(what);

	// // yo dawg, i herd u leik recursion
	//
	// var sources = room.find(FIND_SOURCES);
	// for ( var ind in sources) {
	// var src = sources[ind];
	// var o = src.pos;
	// // flag valid mining spots
	// }
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
			map[x][y].explored = 0;
		}
	}
	var path = allRoadsLeadToRome(from, from, 0, to, room);
	util.dumpObject(path);

}

function placeExtensions(room) {

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
