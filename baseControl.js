/**
 * 
 */
var util = require('common');

function attackHostiles(support) {

    var targets = support.room.find(FIND_HOSTILE_CREEPS);
    if (targets.length == 0) {
        return false
    }
    var hitList = targets.sort(function(a, b) {
        if (a.hits / a.hitsMax > b.hits / b.hitsMax) {
            return 1;
        }
        if (a.hits / a.hitsMax < b.hits / b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    var res = support.attack(hitList[0]);
    switch (res) {
        case OK:
            return true;
            break;
        case ERR_NOT_ENOUGH_ENERGY:
        case ERR_RCL_NOT_ENOUGH:
            return false;
            break;
        default:
            dlog('Attack Error -  ' + util.getError(res));
            return false;
            break;
    }
}

function healTroops(support) {

    var targets = support.room.find(FIND_MY_CREEPS, {
        filter: (i) => i.hits < i.hitsMax
    });
    if (targets.length == 0) {
        return false
    }
    var hitList = targets.sort(function(a, b) {
        if (a.hits / a.hitsMax > b.hits / b.hitsMax) {
            return 1;
        }
        if (a.hits / a.hitsMax < b.hits / b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    var res = support.heal(hitList[0]);
    switch (res) {
        case OK:
            return true;
            break;
        case ERR_NOT_ENOUGH_ENERGY:
            return false;
            break;
        default:
            dlog('Heal Error -  ' + util.getError(res));
            return false;
            break;
    }
}

function repairBase(support) {
    //dlog(support.id + ' trying to repar');
    var targets = support.room.find(FIND_MY_STRUCTURES, {
        filter: (i) => i.hits < i.hitsMax
    });
    //	dlog('found ' + targets.length)
    if (targets.length == 0) {
        return false
    }
    var hitList = targets.sort(function(a, b) {
        if (a.hits / a.hitsMax > b.hits / b.hitsMax) {
            return 1;
        }
        if (a.hits / a.hitsMax < b.hits / b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    var res = support.repair(hitList[0]);
    switch (res) {
        case OK:
            return true;
            break;
        case ERR_NOT_ENOUGH_ENERGY:
        case ERR_RCL_NOT_ENOUGH:
            return false;
            break;
        default:
            dlog('Repair Error -  ' + util.getError(res));
            return false;
            break;
    }
}

function repairRoads(support) {
    //	dlog(support.id + ' trying to repar');
    var targets = support.room.find(FIND_STRUCTURES, {
        filter: (i) => i.hits < i.hitsMax && i.structureType == 'road'
    });
    //		dlog('found ' + targets.length)
    if (targets.length == 0) {
        return false
    }
    var hitList = targets.sort(function(a, b) {
        if (a.hits / a.hitsMax > b.hits / b.hitsMax) {
            return 1;
        }
        if (a.hits / a.hitsMax < b.hits / b.hitsMax) {
            return -1;
        }
        return 0;
    }); // Get most sensible

    var spin = 0;

    while (spin < targets.length) {
        var roadCrack = hitList[spin];
        if (roadCrack.room.memory.heatmap[roadCrack.pos.x][roadCrack.pos.y] < 60) {
            spin++;
            continue;
        }
        var res = support.repair(roadCrack);
        switch (res) {
            case OK:
                return true;
                break;
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_RCL_NOT_ENOUGH:
                return false;
                break;
            default:
                dlog('Road Repair Error -  ' + util.getError(res));
                return false;
                break;
        }
    }
}

function towerControl(room) {

    var towers = room.find(FIND_MY_STRUCTURES, {
        filter: {
            structureType: STRUCTURE_TOWER
        }
    });

    for (var gun in towers) {
        if (attackHostiles(towers[gun]) ||
            //  repairBase(towers[gun]) ||
            repairRoads(towers[gun]) ||
            healTroops(towers[gun])) {
            continue;
        } else {
            return false
        };
    }
}
module.exports.towerControl = towerControl;

function dlog(msg) {
    util.dlog('BASE CONTROL: ', msg);
}
