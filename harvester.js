var util = require('common');

var DEBUG_HARVEST = true;

module.exports.miner = function(creep) {

	mine(creep)
	return;

	var mySource = creep.memory.mySource;
	if (!util.def(mySource)) {
		mySource = null;
	}

	//
	// dlog('Starting miner function for ' + creep.name);
	// New miner check
	if ((mySource == null)) {
		mySource = 'invalid';
		dlog('source undefined, searching for sources in ' + creep.room.name);
		var sourceAssignments = {
			// "invalid" : 0
			"invalid" : 0
		};

		var miners = [];
		var distances = [];
		var creeps = creep.room.find(FIND_MY_CREEPS)

		for ( var unit in creeps) {
			if (creeps[unit].memory.role == 'miner') {
				miners.push(creeps[unit]);
			}
		}

		var gimmeSummin = creep.room.find(FIND_SOURCES);

		// initialize possible values
		for ( var x in gimmeSummin) {
			var sid = gimmeSummin[x].id;
			var source = gimmeSummin[x];
			var numAss = 0;

			for ( var unit in miners) {
				if (miners[unit].memory.mySource == sid) {
					numAss++;
				}
			}
			// Limit miners to three a source
			if (numAss > 3) {
				continue;
			}
			// If less than three, write it down
			distances.push({
				'srcId' : sid,
				'distance' : distance(creep.pos, source.pos),
			});
		}

		if (!distances.length) {
			// no open sources found
			dlog('Too many miners.');
			creep.say("AAAAHHHH MOTHERLAND!!");
			// creep.suicide(); // Nothing else to really do with a miner
		}

		// Should have an array of sources with less than 3 miners already
		// assigned
		// along with how far away they are.

		// Sort by distance
		distances.sort(function(a, b) {
			if (a.distance > b.distance) {
				return 1;
			} else if (a.distance < b.distance) {
				return -1;
			} else {
				return 0;
			}
		});
		dlog("Source found, assigning " + distances[0].srcId + " to "
				+ creep.name);
		creep.memory.mySource = distances[0].srcId;

	}

	// We should have a valid source, should check to make sure

	creep.moveTo(Game.getObjectById(mySource), {
		reusePath : 5
	});
	creep.say('Mining');
	creep.harvest(Game.getObjectById(mySource));
}

function dumpObject(obj) {
	for ( var x in obj) {
		dlog('parameter: ' + x + ' is ' + obj[x]);
	}
}

function dlog(msg) {
	util.dlog('HARVEST', msg);
}

function harvestArbiter(creep) {

	var sources = creep.room.memory.sources;
	var paths = creep.room.memory.paths;

	if (!util.def(sources) || !util.def(paths) || (paths.length == 0)) {
		dlog('Someone is lpoking for a source, but i don\'t know crap about this room')
		return; // Wait for room survey and design
	}

	for ( var src in sources) {
		var thisSrc = sources[src]

		if (!util.def(thisSrc.attendees)) {
			thisSrc.attendees = [];
		} else {

		}
	}

}

function refreshArbiters(room) {

	// Check each creep that has been assigned to a source and check they
	// are
	// still alive and kicking
	// Actual assignment and balancing is done in the assignSource function

	// Evaluate source assignments
	var sources = room.memory.sources;

	if (!util.def(sources)) {
		return // Wait for a room survey to be done
	}

	for ( var src in sources) {
		var thisSrc = sources[src]

		if (!util.def(thisSrc.attendees)) {
			thisSrc.attendees = []; // Should be a list of creep id's
		} else {

			for ( var slave in thisSrc.attendees) {

				var attenId = thisSrc.attendees[slave]; //

				var attendee = Game.getObjectById(attenId)

				if (util.def(attendee) && (attendee.myTargetId == thisSrc.id)) {
					// Check creep is still alive and working on this source
					// okay
					continue;
				} else {
					dlog('Removing ' + thisSrc.id + ' from creeps assigned to '
							+ thisSrc.id)
					thisSrc.attendees.splice(slave, 1)
					// stale id, remove it from the list of id's assigned to
					// this source
				}
			}
		}
	}

	// Evaluate dropped energy assignments

}

module.exports.refreshArbiters = refreshArbiters;

// Optimize energy gathering by available roles in the room
module.exports.sortingHat = function(creep) {

	var taskList = creep.memory.taskList;

	var availPop = creep.room.memory.strategy.currentPopulation;

	// initialize these two for
	// testing later
	// find the miners in the room
	var assignments = {
		'shuttle' : 0,
		'miner' : 0,
		'workerBee' : 0
	};

	creep.room.find(FIND_MY_CREEPS).forEach(function(creeper, index, array) {
		var jerksCurTask = creeper.memory.taskList;

		if (!util.def(jerksCurTask)) {
			dlog('Brain dead creep!');
			return;
		}

		var curTask = jerksCurTask[jerksCurTask.length - 1];
		if (typeof assignments[curTask] === 'undefined') {
			assignments[curTask] = 0;
		}
		assignments[curTask]++;
	});
	switch (creep.memory.role) {

	case 'gatherer': // default tasking for gatherer
		if (util.def(availPop.workerBee) && util.def(availPop.miner)) {
			if (availPop.workerBee <= availPop.miner) {
				if (assignments.shuttle < assignments.miner) {
					creep.memory.taskList.push('shuttle')
				} else {
					creep.memory.taskList.push('janitor')
				}
			}
		} else {
			creep.memory.taskList.push('gatherer')
		}

		break;
	case 'workerBee': // default tasking for worker bee
		creep.memory.taskList.push('shuttle')
		break;
	default:
		dlog("not sure how to sort role " + creep.memory.role)
		return null;
	}

}

module.exports.shuttle = function(creep) {

	if (!util.def(creep.memory.sinkId)
			|| !util.def(Game.getObjectById(creep.memory.sinkId))) {
		creep.memory.sinkId = findSink(creep);
	}

	var mySink = Game.getObjectById(creep.memory.sinkId);

	if (creep.pos.isNearTo(mySink) && (creep.carry.energy > 0)) {
		var result = creep.transferEnergy(mySink);
	} else if (creep.carry.energy == creep.carryCapacity) {
		creep.moveTo(mySink); // TODO: replace moveTo with something
		// more efficient
	} else {
		// Go scrounge for energy
		scrounge(creep, 'collect')
	}
}

function scrounge(creep, mode) {
	var scrounge = creep.room.find(FIND_DROPPED_ENERGY); // TODO possible
	// efficiency gain
	// here
	// I guess the idea is to push a move task onto the taskList to move to a
	// certain source, and then just find the nearest energy?

	if (scrounge.length) {
		// sort by distance
		scrounge.sort(function(a, b) {

			var toA = distance(creep.pos, a.pos)
			var toB = distance(creep.pos, b.pos)

			if (toA < toB) {
				return -1
			} else if (toA > toB) {
				return 1
			} else {

				// same distance away, choose the one with more energy
				if (a.energy > b.energy) {
					return -1
				} else if (a.energy < b.energy) {
					return 1
				}

				return 0
			}
		})

		var srcs = room.memory.sources;

		for ( var s in scrounge) {

			for ( var src in srcs) {
				var disSrc = srcs[src];
				var disDistance = distance(disSrc.pos, scrounge[s].pos)

				// Skip energy that doesn't fit the profile
				if (((disDistance == 1) && (mode == 'sweep'))
						|| ((disDistance > 1) && (mode == 'collect'))) {
					continue;
				}
			}

			if (creep.pos.isNearTo(scrounge[s])) {
				var res = creep.pickup(scrounge[s]);
				if ((res != 0) && (res != ERR_TIRED)) {
					dlog('Error scroundng for NRG, creep ' + creep.name);
				} else {
					break;
				}
			}
			if (creep.carry.energy != creep.carryCapacity) {
				var res = creep.moveTo(scrounge[s]); // don't stomp
				if ((res != 0) && (res != ERR_TIRED)) {
					dlog('Error moving to NRG: ' + creep.name + ' - '
							+ util.getError(res))
				} else {
					break;
				}

			}
		}
	}
}

module.exports.scrounge = scrounge;

function mine(creep) {

	if (!util.def(creep.memory.srcId)
			|| !util.def(Game.getObjectById(creep.memory.srcId))) {
		creep.memory.srcId = findSource(creep);
	}

	var mySrc = Game.getObjectById(creep.memory.srcId);

	if (creep.pos.isNearTo(mySrc)
			&& ((creep.carry.energy < creep.carryCapacity) || (creep.carryCapacity == 0))) {
		var result = creep.harvest(mySrc);

		if ((result != 0) && (result != ERR_TIRED)) {
			dlog(' - ' + creep.name + ': Error trying to mine source ' + mySrc
					+ ', ' + util.getError(result))
		}
	} else if (creep.carry.energy == 0) {
		creep.moveTo(mySrc)
	}

	if (!util.def(creep.memory.sinkId)
			|| !util.def(Game.getObjectById(creep.memory.sinkId))) {
		creep.memory.sinkId = findSink(creep);
	}

	var mySink = Game.getObjectById(creep.memory.sinkId);

	if (creep.pos.isNearTo(mySink) && (creep.carry.energy > 0)) {
		creep.transferEnergy(mySink)
	} else if ((creep.carry.energy == creep.carryCapacity)
			&& (creep.carryCapacity != 0)) {
		var result = creep.moveTo(mySink)

		if ((result != 0) && (result != ERR_TIRED)) {
			dlog(' - ' + creep.name + ': Error trying to (mine) sink ' + mySink
					+ ', ' + util.getError(result))
		}
	} else {
		var result = creep.moveTo(mySrc)

		if ((result != 0) && (result != ERR_TIRED)) {
			dlog(' - ' + creep.name + ': Error returning to mine sink '
					+ mySink + ', ' + util.getError(result))

		}
	}
}

module.exports.gatherer = function(creep) {
	mine(creep)
	scrounge(creep, 'collect')

}
//
// // if (creep.pos.isNearTo(rc) && (creep.carry.energy > 0)) {
//
// // On the first day, he ate one apple
// // but he was still hungry
// if (creep.carry.energy < creep.carryCapacity) {
// scrounge(creep); // hit up miners and other dropped energy
// }
//
// // TODO standardize sinks
//
// // On the second day, he ate through two pears
// // but he was still hungry.
// if (creep.carry.energy < creep.carryCapacity) {
// // TODO: make this valid for every source in the room
// var mySource = creep.room.find(FIND_SOURCES)[0];
// creep.moveTo(mySource, {
// reusePath : 5
// });
//
// if (creep.pos.isNearTo(mySource)) {
// creep.harvest(mySource);
// }
// } else { // That night he had a stomach ache
// var mySink = Game.getObjectById(creep.memory.sinkId);
//
// if ((mySink == null) || isFull(mySink)) {
// creep.memory.sinkId = findSink(creep);
// }
// creep.moveTo(mySink);
// creep.transferEnergy(mySink);
// }

function distance(p1, p2) {
	return Math.floor(Math.sqrt(Math.pow((p1.x - p2.x), 2)
			+ Math.pow((p1.y - p2.y), 2)));
}

function findSink(creep) {
	var structs = creep.room.find(FIND_MY_STRUCTURES);
	var distances = [];

	dlog('Finding sink for ' + creep.name);

	for ( var i in structs) {
		var struct = structs[i];
		var structid = struct.id;

		if ((struct.structureType == STRUCTURE_EXTENSION)
				|| (struct.structureType == 'spawn')) {

			// check there is a path
			if ((creep.moveTo(struct) != ERR_NO_PATH) && (!isFull(struct))) {
				// calculate distance
				distances.push({
					"structid" : structid,
					"distance" : distance(creep.pos, struct.pos),
					"full" : isFull(struct)
				});
				// dlog('ID ' + structid + ' distance is '
				// + distances[structid].toFixed(3));

			}
		}
	}

	if (!distances.length) {
		return null;
	}

	// Sort by distances

	distances.sort(function(a, b) {
		if (a.distance > b.distance) {
			return 1;
		}
		if (a.distance < b.distance) {
			return -1;
		}
		return 0;
	});

	// Use first not-full option
	for ( var candidate in distances) {
		if (distances[candidate].isFull) {
			continue;
		} else {
			return distances[candidate].structid;
		}
	}

	// if we are here, there are no non-full sinks. just move to the closest one
	// and wait
	return distances[0].structid;

	// TODO: Add storage logic
	// if ([ STRUCTURE_EXTENSION, 'storage' ].indexOf(struct.structureType)
	// == -1) {
	// continue;
	// }

	// All extensions and spawns are full. Hit up the controller then
	// for ( var i in structs) {
	// var struct = structs[i];
	// if ((struct.structureType == STRUCTURE_CONTROLLER)) {
	// return struct;
	// }
	// }
}

function findSource(creep) {
	var sources = creep.room.find(FIND_SOURCES);
	var distances = [];

	// dlog('Finding source for ' + creep.name);

	for ( var i in sources) {
		var source = sources[i];
		var srcId = source.id;
		distances.push({
			"srcId" : srcId,
			"distance" : distance(creep.pos, source.pos)
		// "full" : isFull(struct) // TODO, add energy evailable weighting
		});
	}

	// Sort by distances

	distances.sort(function(a, b) {
		if (a.distance > b.distance) {
			return 1;
		}
		if (a.distance < b.distance) {
			return -1;
		}
		return 0;
	});

	// Go to closest
	return distances[0].srcId;

	// TODO: Add storage logic
	// if ([ STRUCTURE_EXTENSION, 'storage' ].indexOf(struct.structureType)
	// == -1) {
	// continue;
	// }

	// All extensions and spawns are full. Hit up the controller then
	// for ( var i in structs) {
	// var struct = structs[i];
	// if ((struct.structureType == STRUCTURE_CONTROLLER)) {
	// return struct;
	// }
	// }
}

function isFull(sink) {
	// console.log(sink.structureType + ": " + sink.energy +
	// "/"+sink.energyCapacity);
	if ((sink.structureType == STRUCTURE_EXTENSION)
			|| (sink.structureType == STRUCTURE_SPAWN)) {
		// console.log(sink.structureType + ": " + sink.energy +
		// "/"+sink.energyCapacity);
		return sink.energy == sink.energyCapacity;
	} else if (sink.structureType == 'storage') {
		// console.log(sink.structureType + ": " + sink.store +
		// "/"+sink.storeCapacity);
		return sink.store == sink.storeCapacity;
	}
}
