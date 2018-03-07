/**
 * 
 */
var util = require('common');

function attackHostiles(support) {


    var towers = support.room.memory.cache.towers;

    if (!util.def(towers.onAlert)) {
        towers.onAlert = false;
    }


    if (!util.def(towers.timeouts.attack)) {
        towers.timeouts.attack = Game.time;
    }
    var targets = [];
    if (towers.onAlert || (towers.timeouts.attack < Game.time)) {
        targets = support.room.find(FIND_HOSTILE_CREEPS);
        towers.timeouts.attack = Game.time + 11 + util.getRand(1, Object.keys(Game.rooms).length);
    }

    if (targets.length == 0) {
        towers.onAlert = false;
        return false;
    } else {
        towers.onAlert = true;
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

    var towers = support.room.memory.cache.towers;

    if (!util.def(towers.injured)) {
        towers.injured = false;
    }

    if (!util.def(towers.timeouts.heal)) {
        towers.timeouts.heal = Game.time;
    }

    var targets = [];
    if (towers.injured || (towers.timeouts.heal < Game.time)) {
        towers.timeouts.heal = Game.time + 11 + util.getRand(1, Object.keys(Game.rooms).length);
        support.room.log("scanning for heal")
        var targets = support.room.find(FIND_MY_CREEPS, {
            filter: (i) => i.hits < i.hitsMax
        });
    }

    if (targets.length == 0) {
        towers.injured = false;
        return false
    } else {
        towers.injured = true;
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

    var towers = support.room.memory.cache.towers;

    if (!util.def(towers.damaged)) {
        towers.damaged = false;
    }

    if (!util.def(towers.timeouts.repair)) {
        towers.timeouts.repair = Game.time;
    }

    var targets = [];
    if (towers.damaged || (towers.timeouts.repair + 61 + util.getRand(1, Object.keys(Game.rooms).length) < Game.time)) {
        var targets = support.room.find(FIND_MY_STRUCTURES, {
            filter: (i) => i.hits < i.hitsMax
        });
    }

    if (targets.length == 0) {
        towers.damaged = false;
        return false
    } else {
        towers.damaged = true;
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

    var towers = support.room.memory.cache.towers;

    if (!util.def(towers.potholes)) {
        towers.potholes = false;
    }

    if (!util.def(towers.timeouts.fixroads)) {
        towers.timeouts.fixroads = Game.time;
    }

    var targets = [];
    if (towers.potholes || (towers.timeouts.fixroads + 21 + util.getRand(1, Object.keys(Game.rooms).length) < Game.time)) {
        var targets = support.room.find(FIND_STRUCTURES, {
            filter: (i) => i.hits < i.hitsMax && i.structureType == 'road'
        });

    }
    if (targets.length == 0) {
        towers.potholes = false;
        return false
    } else {
        towers.potholes = true;
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

    // sanity checks
    if (!util.def(room.memory.cache)) {
        room.memory.cache = {};
    }
    var towers = room.memory.cache.towers;


    if (!util.def(towers) || !util.def(towers.refreshed)) {
        room.memory.cache.towers = {
            refreshed: 0
        }
        return;
    }

    if (!util.def(towers.timeouts)) {
        dlog('ber')
        towers.timeouts = {
            attack: Game.time,
            repair: Game.time,
            heal: Game.time,
            roads: Game.time
        };
        return;
    }


    if (towers.refreshed + 317 + util.getRand(1, 100) < Game.time) {
        // cache expired. redo.
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
            repairBase(thisTower) ||
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
