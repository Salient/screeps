var util = require('common');

var DEBUG_HARVEST = true;

module.exports.miner = function(creep) {
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
				'sourceId' : sid,
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
		dlog("Source found, assigning " + distances[0].sourceId + " to "
				+ creep.name);
		creep.memory.mySource = distances[0].sourceId;

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

// Optimize energy gathering by available roles in the room
module.exports.sortingHat = function(creep) {

	var taskList = creep.memory.taskList;

	if (!util.def(taskList)) {
		return null;
	}
	var availPop = creep.room.memory.strategy.currentPopulation;

	// initialize these two for
	// testing later
	// find the miners in the room
	var assignments = {
		'shuttle' : 0,
		'miner' : 0
	};

	creep.room.find(FIND_MY_CREEPS).forEach(function(creeper, index, array) {
		var jerksCurTask = creeper.memory.taskList;

		var curTask = jerksCurTask[jerksCurTask.length - 1];
		if (typeof assignments[curTask] === 'undefined') {
			assignments[curTask] = 0;
		}
		assignments[curTask]++;
	});

	switch (creep.memory.role) {

	case 'gatherer': // default tasking for gatherer
		if (availPop.workerBee < availPop.miner) {
			if (assignments.shuttle < assignments.miner) {
				creep.memory.taskList.push('shuttle')
			} else {
				creep.memory.taskList.push('builder')
			}
		} else {
			if (availPop.miner) {
				creep.memory.taskList.push('builder')
			} else {
				creep.memory.taskList.push('gatherer')
			}
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

	// Go scrounge for energy
	if (creep.carry.energy < (creep.carryCapacity)) {
		creep.room.find(FIND_DROPPED_ENERGY).forEach(function(site) {
			creep.moveTo(site, {
				reusePath : 5
			});
			creep.pickup(site);
			if (creep.carry.energy == creep.carryCapacity) {
				return;
			}
		});
	} else {
		var mySink = Game.getObjectById(creep.memory.sinkId);

		if ((mySink == null) || isFull(mySink)) {
			creep.memory.sinkId = findSink(creep);
		}
		mySink = Game.getObjectById(creep.memory.sinkId);

		if ((mySink == null) || isFull(mySink)) {
			// dlog('No valid energy storage available!!');
			return;
		}

		var dd = creep.moveTo(mySink, {
			reusePath : 5
		});
		if (dd == ERR_NO_PATH) {
			mySink = null;
		}
		if (dd != 0) {

			dlog("Creep " + creep.name + " cannot move! " + util.getError(dd));
		}

		if (creep.pos.isNearTo(mySink)) {
			var result = creep.transferEnergy(mySink);
			if (result != 0) {
				dlog("Creep " + creep.name + " cannot unload! "
						+ util.getError(result));
			}
		}
	}
}

function scrounge(creep) {
	var scrounge = creep.room.find(FIND_DROPPED_ENERGY);

	if (scrounge.length) {
		for ( var s in scrounge) {
			if (creep.carry.energy != creep.carryCapacity) {
				creep.moveTo(scrounge[s]);
				if (creep.pos.isNearTo(scrounge[s])) {
					creep.pickup(scrounge[s]);
				}
			}
		}
	}
}
module.exports.scrounge = scrounge;

module.exports.gatherer = function(creep) {

	// On the first day, he ate one apple
	// but he was still hungry
	if (creep.carry.energy < creep.carryCapacity) {
		scrounge(creep); // hit up miners and other dropped energy
	}

	// TODO standardize sinks

	// On the second day, he ate through two pears
	// but he was still hungry.
	if (creep.carry.energy < creep.carryCapacity) {

		var mySource = creep.room.find(FIND_SOURCES)[0];
		creep.moveTo(mySource, {
			reusePath : 5
		});

		if (creep.pos.isNearTo(mySource)) {
			creep.harvest(mySource);
		}
	} else { // That night he had a stomach ache
		var mySink = Game.getObjectById(creep.memory.sinkId);

		if ((mySink == null) || isFull(mySink)) {
			creep.memory.sinkId = findSink(creep);
		}
		creep.moveTo(mySink);
		creep.transferEnergy(mySink);
	}
}
function distance(p1, p2) {
	return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
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
			if (creep.moveTo(struct) != ERR_NO_PATH) {
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
		var sourceid = source.id;
		distances.push({
			"sourceid" : sourceid,
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
	return distances[0].sourceid;

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
