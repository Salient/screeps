module.exports.miner = function(creep) {

	var mySource = creep.memory.mySource;

	// New miner check
	if (typeof mySource === 'undefined' || (mySource == null)) {
		mySource = 'invalid';
		var sourceAssignments = {
			"invalid" : 0
		};

		creep.room.find(FIND_SOURCES).forEach(function(source) {
			sourceAssigmments[source] = 0;
		});

		creep.room.find(FIND_MY_CREEPS, {
			filter : {
				role : 'miner'
			}
		}).forEach(function(creep) {
			sourceAssignments[creep.memory.mySource]++
		});

		// Should have an array of sources and the number of miners which have
		// that
		// source targeted

		// Current limit per source is 3

		for ( var source in sourceAssignments) {
			if (sourceAssignments[source] < 3) {
				mySource = source;
			}
		}

		// If we are still invalid, we have counted 3 or more miners targeting
		// all sources

		if (mySource == 'invalid') {
			creep.say("AAAAHHHH MOTHERLAND!!");
			creep.suicide(); // Nothing else to really do with a miner
		}
	}

	// We should have a valid source, should check to make sure

	creep.moveTo(mySource);
	creep.harvest(mySource);
	creep.say("Workin' on the rail road...");
}

module.exports.shuttle = function(creep) {

	// Go scrounge for energy
	if (creep.carry.energy < creep.carryCapacity) {
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
		creep.moveTo(mySink);
		creep.transferEnergy(mySink);
	}
}

function findSink(creep) {
	var structs = creep.room.find(FIND_MY_STRUCTURES);

	for ( var i in structs) {
		var struct = structs[i];
		if ((struct.structureType == STRUCTURE_EXTENSION)
				|| (struct.structureType == 'spawn')) {
			if (!isFull(struct)) {
				return struct;
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
