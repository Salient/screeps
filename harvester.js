module.exports = function(creep) {

	var mySource = creep.memory.mySource;

	var mySource = creep.room.find(FIND_SOURCES)[0];
	if (mySource == null) {
		mySource = assignSource(creep);
	}

	// console.log(creep.name + ": " + creep.carry.energy + "/" +
	// creep.carryCapacity);

	if (creep.carry.energy == 0) {
		creep.moveTo(mySource);
		creep.harvest(mySource);
	} else if ((creep.carry.energy < creep.carryCapacity)
			&& creep.pos.isNearTo(mySource)) {
		creep.harvest(mySource);
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
	for ( var i in structs) {
		var struct = structs[i];
		if ((struct.structureType == STRUCTURE_CONTROLLER)) {
			return struct;
		}
	}
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

// Check for loose change
function pickUpJunk() {
	var dropped = creep.room.find(FIND_DROPPED_ENERGY);
	if (dropped.length) {
		for ( var en in dropped) {
			creep.moveTo(dropped[en]);
			creep.pickup(dropped[en]);
		}
	}
}
