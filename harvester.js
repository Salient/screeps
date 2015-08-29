module.exports.miner = function(creep) {
	var mySource = creep.memory.mySource;
	if (typeof mySource === 'undefined') {
		mySource = null;
	}

	dlog('Starting miner function for ' + creep.name);
	// New miner check
	if ((mySource == null)) {
		mySource = 'invalid';
		dlog('source undefined, searching for sources in ' + creep.room.name);
		var sourceAssignments = {
			// "invalid" : 0
			"invalid" : 0
		};

		var gimmeSummin = creep.room.find(FIND_SOURCES);
		var miners = creep.room.find(FIND_MY_CREEPS, {
			filter : {
				role : 'miner'
			}
		});

		dlog("All sources in room: ");
		// initialize possible values
		for ( var x in gimmeSummin) {
			dlog('parameter ' + x + ' is ' + gimmeSummin[x]);
			var sid = gimmeSummin[x].id;
			dlog("Counting number of miners assigned to each source")
			sourceAssignments[sid] = 0;
			for ( var unit in miners) {
				if (miners[unit].memory.mySource == sid) {
					dlog('Unit ' + unit + ' is assigned to ' + sid);
					sourceAssignments[sid]++;
				}
			}
		}

		// Should have an array of sources and the number of miners which have
		// that
		// source targeted

		// Current limit per source is 3

		dlog('List of assignements to each source: ');

		for ( var source in sourceAssignments) {
			dlog(' parameter ' + source + " is " + sourceAssignments[source]);
			if (sourceAssignments[source] < 3) {
				mySource = source;
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
	creep.say("Workin' on the rail road...");
	creep.harvest(Game.getObjectById(mySource));
}

function dumpObject(obj) {
	for ( var x in obj) {
		dlog('parameter: ' + x + ' is ' + obj[x]);
	}
}

function dlog(msg) {
	console.log("[DEBUG HARVESTER] " + msg);
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

	dlog('wtf...okay so');
	dlog('shuttles; ' + shuttles.length + ' and ' + miners.length);
	dlog('creep name ' + creep.name);
	dlog('creep memory ');
	dumpObject(creep.memory);

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
		var mySink = creep.memory.sink;

		if ((mySink == null) || isFull(mySink)) {
			mySink = findSink(creep);
		}
		dlog('move');
		var dd = creep.moveTo(mySink);
		if (dd == ERR_NO_PATH) {
			mySink = null;
		}
		dlog('result is ' + dd);
		dlog('trans');
		var result = creep.transferEnergy(mySink);

		dlog('result is ' + result);
	}
}

function findSink(creep) {
	var structs = creep.room.find(FIND_MY_STRUCTURES);

	for ( var i in structs) {
		var struct = structs[i];
		if ((struct.structureType == STRUCTURE_EXTENSION)
				|| (struct.structureType == 'spawn')) {
			if (!isFull(struct)) {
				// check tehre is a path
				if (creep.moveTo(struct) != ERR_NO_PATH) {
					return struct;
				}
			}
		}
	}

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
