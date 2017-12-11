/**
 * 
 */
var util = require('common');

function attackHostiles(support) {

	var targets = support.room.find(FIND_HOSTILE_CREEPS);
	if (targets.length == 0) {return false}
	var hitList = targets.sort(function(a, b) {
        if (a.hits/a.hitsMax > b.hits/b.hitsMax) {
            return 1;
        }
        if (a.hits/a.hitsMax < b.hits/b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible
	
	return support.attack(hitList[0]); 

}

function healTroops(support) {

	var targets = support.room.find(FIND_MY_CREEPS, {filter: (i) => i.hits < i.hitsMax});
	if (targets.length == 0) {return false}
	var hitList = targets.sort(function(a, b) {
        if (a.hits/a.hitsMax > b.hits/b.hitsMax) {
            return 1;
        }
        if (a.hits/a.hitsMax < b.hits/b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible
	
	return support.heal(hitList[0]); 
}

function repairBase(support) {
//dlog(support.id + ' trying to repar');
	var targets = support.room.find(FIND_MY_STRUCTURES, {filter: (i) => i.hits < i.hitsMax});
//	dlog('found ' + targets.length)
	if (targets.length == 0) {return false}
	var hitList = targets.sort(function(a, b) {
        if (a.hits/a.hitsMax > b.hits/b.hitsMax) {
            return 1;
        }
        if (a.hits/a.hitsMax < b.hits/b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible
	
	return support.repair(hitList[0]); 
}

function repairRoads(support) {
//	dlog(support.id + ' trying to repar');
		var targets = support.room.find(FIND_STRUCTURES, {filter: (i) => i.hits < i.hitsMax && i.structureType == 'road'});
//		dlog('found ' + targets.length)
		if (targets.length == 0) {return false}
		var hitList = targets.sort(function(a, b) {
	        if (a.hits/a.hitsMax > b.hits/b.hitsMax) {
	            return 1;
	        }
	        if (a.hits/a.hitsMax < b.hits/b.hitsMax) {
	            return -1;
	        }
	        return 0;
	    }); // Get most sensible
		
		return support.repair(hitList[0]); 
	}

function towerControl(room) {
	
	for(var bldg in Game.structures) {
		if (Game.structures[bldg].room != room || Game.structures[bldg].structureType != STRUCTURE_TOWER) {
			continue;
		}
		attackHostiles(Game.structures[bldg]);
		healTroops(Game.structures[bldg]);
		repairBase(Game.structures[bldg]);
		repairRoads(Game.structures[bldg]);
		
	}
}
module.exports.towerControl = towerControl;
function dlog(msg) {
	util.dlog('BASE CONTROL: ', msg);
}
