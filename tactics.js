/**
 */

var util = require('common');

// if target.hits >> current hits or attack power, and posse.totalHits <<
// target.hits
// doNotEngage();
// Find rampart
module.exports.duty = function(creep) {
	var targets = creep.room.find(FIND_HOSTILE_CREEPS);
	if (targets.length) {
		targets.sort()
		for ( var infidel in targets)
			if (leeroooooy(creep, targets[infidel])) {
				creep.moveTo(targets[infidel]);
				creep.attack(targets[infidel]);
			}
	} else {
		// Default muster point
		if (!(typeof Game.flags.muster1 === 'undefined')) {
			// dlog('No fights worth fighting, return to muster point');
			// dlog('result: ' +
			// util.getError(creep.moveTo(Game.flags.muster1)));
			creep.moveTo(Game.flags.muster1);
		}
	}
}

function leeroooooy(myCreep, targetCreep) { // check if it's in my league
	if (targetCreep.hitsMax < (myCreep.hitsMax * 2)) {
		return true;
	}
	return false;
}
function dlog(msg) {
	util.dlog('TACTICS', msg);
}