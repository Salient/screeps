/**
*/

var util = require('common');

Room.prototype.engagementRules = function(room) {
  // Establish rules of engagement
  // Dictated by strategy in room
  if (util.def(room.memory.strategy.engagementRules)) {
    return room.memory.strategy.engagementRules;
  } else {
    return 'Guard';
  } // default engagement stance
}

// Recognized marching orders for soldiers
// Retaliate - Cleared to attack that creep/owner? if attacked by them first
// Otherwise, go about your business
// Guard - given a structure/flag, stay within 5 squares of structure. May
// attack any enemy inside that zone
// Patrol - cycle through a list of way points, intercept and engage within 5
// squares

// 'Rules of Engagement' is basically a room setting for the default marching
// orders for soldiers

// if target.hits >> current hits or attack power, and posse.totalHits <<
// target.hits
// doNotEngage();
// Find rampart
module.exports.duty = function(creep) {
  if (util.def(creep.memory.classified)
    && util.def(creep.memory.classified.orders)) {
    var orders = creep.memory.classified.orders;
    switch (orders) {
      case 'guard':
	guard(creep);
	break;
      default:
	dlog("unrecognized orders given to private " + creep.name);
    }

  } else {
    var aRingOnIt = creep.room.memory.strategy.engagementRules;
    if (!util.def(aRingOnIt)) {
      dlog("Assigning default rules of engagement to room "
	+ creep.room.name);
      creep.room.memory.strategy.engagementRules = 'guard';
    }
    var aRingOnIt = creep.room.memory.strategy.engagementRules;

    creep.memory.classified = {
      'orders' : aRingOnIt
    };
  }

  var targets = creep.room.find(FIND_HOSTILE_CREEPS);
  var forGlory = 0;
  if (targets.length) {
    targets.sort(function(a, b) {
      if (a.hits > b.hits) {
	return 1;
      }
      if (a.hits < b.hits) {
	return -1;
      }
      return 0;
    }); // TODO add some distance weighting? better pathing?
    for ( var infidel in targets)
      if (leeroooooy(creep, targets[infidel])) {
	forGlory = 1;
	creep.moveTo(targets[infidel]);
	creep.attack(targets[infidel]);
      }
  }

  // Default muster point
  if (!forGlory) {
    if (!(typeof Game.flags.Flag1 === 'undefined')) {
      // dlog('No fights worth fighting, return to muster point');
      // dlog('result: ' +
      // util.getError(creep.moveTo(Game.flags.muster1)));
      creep.moveTo(Game.flags.Flag1);
      /// dlog('flag set');
    }
  } else 
  { // man a random exit in the room
    var exits = creep.room.find(FIND_EXIT);
    if (exits[0] != null){

      var post = exits[Math.floor(Math.random()*exits.length)];
      creep.debug = post; 
        // dlog('set');
    }
  }
}
function leeroooooy(myCreep, targetCreep) { // check if it's in my league
  if (targetCreep.hitsMax < (myCreep.hitsMax * 2)) {
    return true;
  }
  return false;
}
function guard(creep) {
  var objective = creep.memory.classified.objective; // objective should be a
//  return
  //  if (util.def(objective)) {
  //    dlog('kk'); } else {
  //     dlog('nono'); }
  //dlog("checking " + creep.name + " is at " + creep.pos.x + ',' + creep.pos.y);
  // dlog("should be at " + creep.name + " is at " + objective.x + ',' + objective.y);
  //  if (creep.pos == objective) {
  // at guard post
  //    return;
  //  }

  // structure or creep
  if (util.def(objective)) {
    if (util.def(creep.memory.path)) {
      if (util.def(creep.memory.path)) { creep.moveTo(creep.memory.path) } }      

    var vector = new RoomPosition(objective.x, objective.y, objective.roomName);
    var error = creep.moveTo(vector,{reusePath: 5, visualizePathStyle: {stroke: '#ffaa00'}});
    if (error != OK && error != ERR_TIRED) {
      dlog("Error moving to guard post (" + objective.x + "," + objective.y + "), " + util.getError(error));
      creep.memory.classified.objective = null; 
    } 
  } else {
    // assignObjective? get list of strucutres types to guard from strategy?
    guardDuty(creep);
  }
}
function dlog(msg) {
  util.dlog('TACTICS', msg);
}


function guardDuty(creep) {

  var exits = creep.room.find(FIND_EXIT);
  if (exits[0] != null){
    var post = exits[Math.floor(Math.random()*exits.length)];
    if (post.x == 0) {post.x++} else {post.x--}
    if (post.y == 0) {post.y++} else {post.y--}

    creep.memory.classified.objective = post;
  }
  //creep.objective = 
}
