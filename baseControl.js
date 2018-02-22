/**
 * 
 */
var util = require('common');

function attackHostiles(support) {


    if (!util.def(support.room.memory.onAlert)) {
        support.room.memory.onAlert = false;
    }

    var targets = [];
    if (support.room.memory.onAlert || !(Game.time % 11)) {
        targets = support.room.find(FIND_HOSTILE_CREEPS);
    }

    if (targets.length == 0) {
        support.room.memory.onAlert = false;
        return false
    } else {
        support.room.memory.onAlert = true;
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


    if (!util.def(support.room.memory.injured)) {
        support.room.memory.injured = false; 
    }

    // temp
    if (support.room.memory.injured == 'no') {
    support.room.memory.injured = false;
    }

    var targets = [];
    if (support.room.memory.injured  || !(Game.time % (11 + util.getRand(0, 3)))) {
        var targets = support.room.find(FIND_MY_CREEPS, {
            filter: (i) => i.hits < i.hitsMax
        });
    }

    if (targets.length == 0) {
        support.room.memory.injured = false ; 
        return false
    } else {
        support.room.memory.injured = true;
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
        dlog('d')

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

    if (!util.def(support.room.memory.damanged)) {
        support.room.memory.damanged = false;
    }

    var targets = [];
    if (support.room.memory.damanged || !(Game.time % 61)) {
        var targets = support.room.find(FIND_MY_STRUCTURES, {
            filter: (i) => i.hits < i.hitsMax
        });
    }

    if (targets.length == 0) {
        support.room.memory.damanged = false;
        return false
    } else {
        support.room.memory.damanged = true;
    }
    //dlog(support.id + ' trying to repar');
    //	dlog('found ' + targets.length)
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

    if (!util.def(support.room.memory.potholes)) {
        support.room.memory.potholes = false;
    }

    var targets = [];
    if (support.room.memory.potholes || !(Game.time % 150 + util.getRand(1,21))) {

        var targets = support.room.find(FIND_STRUCTURES, {
            filter: (i) => i.hits < i.hitsMax && i.structureType == 'road'
        });

    }

    if (targets.length == 0) {
        support.room.memory.potholes = false;
        return false
    } else {
        support.room.memory.potholes = true;
    }
    //	dlog(support.id + ' trying to repar');

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
        if (roadCrack.room.memory.trafficMap && roadCrack.room.memory.trafficMap[roadCrack.pos.x] && roadCrack.room.memory.trafficMap[roadCrack.pos.x][roadCrack.pos.y]) {
            var road = roadCrack.room.memory.trafficMap[roadCrack.pos.x][roadCrack.pos.y];
            var decrement = road.heat - (Game.time - road.refereshed); 
            road.heat = (decrement > road.heat) ? 0 : road.heat - decrement;
            road.refereshed = Game.time;
            if (road.heat < 30) {
                spin++;
                continue;
            }
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


    if (!Game.rooms[room.name]) {
        return false;
    }

    var towers = room.memory.towers;
    if (!util.def(towers) || !util.def(towers.refreshed)) {
        room.memory.towers = {
            refreshed: 0
        }
    }

    if (towers.refreshed + 317 + util.getRand(1, 100) < Game.time) {
        // cache expired. redo.
        dlog('tower cache expired')
        towers.refreshed = Game.time;
        var towerIds = room.find(FIND_MY_STRUCTURES, {
            filter: {
                structureType: STRUCTURE_TOWER
            }
        });
        var temp = [];
        for (var ind in towerIds) {
            temp.push(towerIds[ind].id);
        }
        towers.assets = temp;
    }

    for (var gun in towers.assets) {
        var thisTower = Game.getObjectById(towers.assets[gun]);
        if (!thisTower) {
            continue
        }

        if (attackHostiles(thisTower) ||
            //  repairBase(thisTower) ||
            repairRoads(thisTower) ||
            healTroops(thisTower)) {
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
