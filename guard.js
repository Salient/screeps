module.exports = function (creep) {
      var targets = creep.room.find(FIND_HOSTILE_CREEPS);
      if(targets.length) {
        creep.moveTo(targets[0]);
        creep.attack(targets[0]);
      }
}

