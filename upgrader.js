module.exports = function (creep) {

    var rc = creep.room.controller;
    var sources = creep.room.find(FIND_SOURCES);

  if(creep.carry.energy == 0) {
    creep.moveTo(sources[0]);
    creep.harvest(sources[0]);
  }

  if(creep.carry.energy == creep.carryCapacity) {
      creep.moveTo(rc);
     // creep.say(rc.progress / rc.progressTotal + "%");
     // creep.upgradeController(rc);
    }

    if(creep.pos.isNearTo(rc)) {
        creep.say(completedPretty(rc) + "%");
        creep.upgradeController(rc);
    }

    if(creep.pos.isNearTo(sources[0])) {
        creep.harvest(sources[0])
    }
}

function completedPretty(rc) {
    return parseInt((rc.progress / rc.progressTotal) * 100);
}
