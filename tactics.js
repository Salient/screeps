/**
 */

var util = require('common');

// if target.hits >> current hits or attack power, and posse.totalHits <<
// target.hits
// doNotEngage();
// Find rampart
module.exports.duty = function(creep) {
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