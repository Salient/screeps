module.exports = function (creep) {
    //var mySource = creep.memory.mySource;
  var mySource = creep.room.find(FIND_SOURCES)[0];
    if (mySource == null) {
        mySource = assignSource(creep);
    }

    //console.log(creep.name + ": " + creep.carry.energy + "/" + creep.carryCapacity);

  if(creep.carry.energy == 0) {
    creep.moveTo(mySource);
      creep.harvest(mySource);
  } else if (creep.carry.energy < creep.carryCapacity && creep.pos.isNearTo(mySource)) {
      creep.harvest(mySource);
  } else {
      var mySink = creep.memory.sink;

      if(mySink == null || isFull(mySink)) {
          mySink = findSink(creep);
      }
    creep.moveTo(mySink);
    creep.transferEnergy(mySink);
  }
}


function findSink(creep) {
    var structs = creep.room.find(FIND_MY_STRUCTURES),
    spawns = creep.room.find(FIND_MY_SPAWNS),
    harvestersInRoom =  creep.room.find(FIND_MY_CREEPS, {
    filter: {role: 'harvester'}});

    for(var i in spawns) {
        var spawn = spawns[i];

        if(!isFull(spawn)) {
            return spawn;
        }
    }

    for (var i in structs) {
        var struct = structs[i];
        if ([STRUCTURE_EXTENSION, 'storage'].indexOf(struct.structureType) == -1) {
            continue;
        }

        if (!isFull(struct) || struct.structureType == 'storage') {
            return struct;
        }
    }
}

function isFull(sink) {
    //console.log(sink.structureType + ": " + sink.energy + "/"+sink.energyCapacity);
    if (sink.structureType == STRUCTURE_EXTENSION || sink.structureType == STRUCTURE_SPAWN) {
        //console.log(sink.structureType + ": " + sink.energy + "/"+sink.energyCapacity);
        return sink.energy == sink.energyCapacity;
    } else if (sink.structureType == 'storage') {
        //console.log(sink.structureType + ": " + sink.store + "/"+sink.storeCapacity);
        return sink.store == sink.storeCapacity;
    }
}

function assignSource(creep) {
    var sources = creep.room.find(FIND_SOURCES);
}
