var util = require('common');

var DEBUG_HARVEST = true;

module.exports.miner = function(creep) {
	var mySource = creep.memory.mySource;
	if (typeof mySource === 'undefined') {
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

		var gimmeSummin = creep.room.find(FIND_SOURCES);
		var miners = [];
		var creeps = creep.room.find(FIND_MY_CREEPS)

		for ( var unit in creeps) {
			if (creeps[unit].memory.role == 'miner') {
				miners.push(creeps[unit]);
			}
		}

		// initialize possible values
		for ( var x in gimmeSummin) {
			var sid = gimmeSummin[x].id;
			sourceAssignments[sid] = 0;
			for ( var unit in miners) {
				if (miners[unit].memory.mySource == sid) {
					sourceAssignments[sid]++;
				}
			}
		}

		// Should have an array of sources and the number of miners which have
		// that
		// source targeted

		// Current limit per source is 3
		for ( var source in sourceAssignments) {
			dlog(' parameter ' + source + " is " + sourceAssignments[source]);
			if (sourceAssignments[source] < 3) {
				dlog("Source found, assigning " + source + " to " + creep.name);
				creep.memory.mySource = source;
			}
		}

		// If we are still invalid, we have counted 3 or more miners targeting
		// all sources

		if (mySource == 'invalid') {
			dlog('Too many miners.');
			creep.say("AAAAHHHH MOTHERLAND!!");
			// creep.suicide(); // Nothing else to really do with a miner
		}
	}

	// We should have a valid source, should check to make sure

	creep.moveTo(Game.getObjectById(mySource));
	creep.say("Mining...");
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

// Try and keep shuttles and miners balanced in the room
module.exports.sortingHat = function(creep) {
	// find the miners in the room
	var miners = creep.room.find(FIND_MY_CREEPS, {
		filter : {
			role : 'miner'
		}
	});
	var shuttles = creep.room.find(FIND_MY_CREEPS, {
		filter : {
			task : 'shuttle'
		}
	});

	if (shuttles.length < miners.length) {
		creep.memory.taskList.push('shuttle');
	} else {
		creep.memory.taskList.push('shuttle');// change to builders or
		// something later
	}
}

module.exports.shuttle = function(creep) {

	// Go scrounge for energy
	if (creep.carry.energy < (creep.carryCapacity) / 3) {
		creep.room.find(FIND_DROPPED_ENERGY).forEach(function(site) {
			creep.moveTo(site);
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
			dlog('No valid energy storage available!!');
			return;
		}

		var dd = creep.moveTo(mySink);
		if (dd == ERR_NO_PATH) {
			mySink = null;
		}
		if (dd != 0) {

			dlog("Creep " + creep.name + " cannot move! " + util.getError(dd));
		}

		var result = creep.transferEnergy(mySink);
		if (!result) {
			dlog("Creep " + creep.name + " cannot unload! "
					+ util.getError(result));
		}
	}
}

module.exports.gatherer = function(creep) {

	var mySource = creep.room.find(FIND_SOURCES)[0];

	if (creep.carry.energy == 0) {
		creep.moveTo(mySource);
		creep.harvest(mySource);
	} else if ((creep.carry.energy < creep.carryCapacity)
			&& creep.pos.isNearTo(mySource)) {
		creep.harvest(mySource);
	} else {
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
	var distances = {};

	// dlog('Finding sink for ' + creep.name);

	for ( var i in structs) {
		var struct = structs[i];
		var structid = struct.id;

		if ((struct.structureType == STRUCTURE_EXTENSION)
				|| (struct.structureType == 'spawn')) {
			if (!isFull(struct)) {
				// check there is a path
				if (creep.moveTo(struct) != ERR_NO_PATH) {
					// calculate distance
					distances[structid] = distance(creep.pos, struct.pos);
					// dlog('ID ' + structid + ' distance is '
					// + distances[structid].toFixed(3));
				}
			}
		}
	}

	var closest = 'empty';
	var sinkId;
	;
	for ( var candidate in distances) {
		if (closest == 'empty') {
			closest = distances[candidate];
			sinkId = candidate;
		}
		if (distances[candidate] < closest) {
			closest = distances[candidate];
			sinkId = candidate;
		}
	}
	// dlog("closest determined to be " + sinkId);
	return sinkId;

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
