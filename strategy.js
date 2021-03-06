/**
 * 
 */

// var population = require('population');
var planning = require('cityPlanning');
var util = require('common');
var _ = require('lodash');


Room.prototype.getLevel = function() {
    return this.controller.level;
}

Room.prototype.coolEconStats = function() {
    if (!util.def(this.memory.strategy)) {
        this.bootstrap();
    }
    var econ = this.memory.strategy.economy;
    if (!util.def(econ)) {
        this.bootstrap();
    }

    econ.gatherMiss = (econ.gatherMiss > 0) ? econ.gatherMiss - 1 : 0;
    econ.tankMiss = (econ.tankMiss > 0) ? econ.tankMiss - 1 : 0;

}

Room.prototype.tankMiss = function() {
    if (!util.def(this.memory.strategy)) {
        this.bootstrap();
    }
    var econ = this.memory.strategy.economy;
    if (!util.def(econ)) {
        this.bootstrap();
    }
    if (econ.tankMiss < 2000) {
        econ.tankMiss++;
    }
}

Room.prototype.gatherMiss = function() {
    var econ = this.memory.strategy.economy;
    if (!util.def(econ)) {
        this.bootstrap();
    }

    econ.gatherMiss++;
}

// Basic strategy for building and fortifying a room
// Controller lvl 1
// --------------------
// Setup energy harvesting
// Create some low level soldiers
// Upgrade to lvl 2
// Controller lvl 2
// --------------------
// Create 5-6 extensions (need path checking)?
// Establish perimeter, build walls and ramparts
// fortify walls/ramparts
// upgrade to lvl3
// Controller lvl 3
// --------------------
// Create roads to source(s) and extensions
// Create beefier units, medics
// continue upgrading controller
// start scouting?
// Controller lvl 4
// --------------------
// Create energy storage
// Continue upgrading controller
// Controller lvl 5
// --------------------
// I don't know...never gotten this far.
// I suppose start creating links and have each room just store and transfer
// energy
// Move soldiers to outer rooms
//
//
// var population.design = {
// "miner" : [ WORK, WORK, MOVE ], Cost 300
// "workerBee" : [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ], cost 300
// "construction" : [ WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY ], cost 500,
// Can't build til lvl 2
// "engineer" : [ WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY ], cost 500
// ''
// "footSoldier" : [ TOUGH, ATTACK, MOVE, MOVE ], cost 190
// "cavalry" : [ TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK,
// ATTACK ]
// // TODO: ranged units, medics
// };
//
// var goalDemographics = { // unit types will be built in order listed
// "workerBee" : 0.4,
// "construction" : 0.25,
// "engineer" : 0.25,
// "footSoldier" : 0.1
// }
//
// var minDemographics = { // Help bootstrap early game population
// 'miner' : 3,
// 'workerBee' : 3,
// 'footSoldier' : 2
// }
//	

function dlog(msg) {
    util.dlog('STRATEGY', msg);
}

// Basic caste definitions
// 
// Come up with a base composition, and then scale to available energy capacity
//

Room.prototype.updateStrategy = function() {
    var lvl = this.controller.level;
    var strat = this.memory.strategy;

    switch (lvl) {
        case 1:
        case 2:
            strat.population.minWorker = 3;
            break;
        case 3:
            strat.population.minWorker = 5;
            break;
        case 4:
            strat.population.minWorker = 4;
            break;
        case 5:
            strat.population.minWorker = 3;
            break;
        case 6:
            strat.population.minWorker = 3;
            break;
        case 7:
            strat.population.minWorker = 2;
            break;
        case 8:
            strat.population.minWorker = 2;
            break;
    }
}

module.exports.strategery = function(room) {

    // //////////////
    // Debug

    if (!util.def(room.memory.strategy) && room.controller && room.controller.my) {
        room.log('Bootstrapping!')
        room.bootstrap();
    }
    else { return false;}
    var roomConfig = room.memory.strategy;

    // /////////////
    // State check

    if (!util.def(room.controller)) {
        // room not owned yet. bail for now
        return;
    }

    if (roomConfig.curlvl != room.controller.level) {
        roomConfig.curlvl = room.controller.level;

        planning.controlLevelChange(room);
        room.updateStrategy();
        // Contact the city council
        //planning.designRoom(room)
    }


    var selectStrat = [lvl0room, lvl1room, lvl2room, lvl3room, lvl4room,
        lvl5room, lvl6room, lvl7room
    ];

    //	selectStrat[roomConfig.curlvl](room);
}

Room.prototype.bootstrap = function() {
    var strategy = {
        castes: {
            'worker': [CARRY, WORK, MOVE, CARRY, MOVE, MOVE, WORK, MOVE],
            "miner": [MOVE, WORK, WORK, WORK, WORK],
            "soldier": [MOVE, ATTACK, TOUGH, MOVE, ATTACK, TOUGH, MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE, TOUGH, MOVE],
            "medic": [MOVE, HEAL, TOUGH, MOVE],
            "seedling": [CLAIM, MOVE],
            "scout": [MOVE, TOUGH, "end"]
        },
        curlvl: 0,
        rulesOfEngagement: 'guard',
        defcon: 5,
        population: {
            maxPop: 30,
            popPerLvl: 10,
            minWorker: 3,
            minerWeight: 55,
            medicWeight: 35 // Aim for one medic per three soldiers. TODO: code medic behavior
        },
        construction: {
            maxBuildSites: 5,
            roadWeight: 10
        },
        economy: {
            gatherMiss: 0,
            tankMiss: 0,
            energyReservePerLevel: 20000 // Rainy Day Fund
        }
    }
    this.memory.strategy = strategy;
    this.memory.nextSpawn = 1;
}

Room.prototype.getCastes = function() {
    if (!util.def(this.memory.strategy)) {
        this.bootstrap();
    }
    return this.memory.strategy.castes;
}

var lvl1room = function(room) {
    var roomConfig = room.memory.strategy;
    if (!util.def(roomConfig)) {
        return false
    }
}

var lvl0room = function(room) {
    var roomConfig = room.memory.strategy;
    if (!util.def(roomConfig)) {
        return false
    }
}

var lvl2room = function(room) {

    var shafts = _.keys(room.memory.shafts).length;

    var roomConfig = room.memory.strategy;
    // Setup population goals
    roomConfig.latestModels = {
        "miner": [WORK, WORK, MOVE],
        "workerBee": [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        "private": [TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE],
        "pfc": [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, RANGED_ATTACK,
            RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE
        ],
        "medic": [TOUGH, TOUGH, TOUGH, HEAL, HEAL, MOVE, MOVE],
        "technician": [MOVE, MOVE, WORK, CARRY, CARRY],
        "builder": [MOVE, MOVE, CARRY, CARRY, CARRY, WORK, WORK, WORK]

    };

    // demographics effect build order
    roomConfig.goalDemographics = {
        "workerBee": 0.25,
        "private": 0.2,
        "technician": 0.23,
        "builder": 0.4,
        "pfc": 0.3,
        "medic": 0.1
    };

    roomConfig.minDemographics = {
        "workerBee": shafts,
        "miner": shafts,
        "builder": 4
    }

    roomConfig.maxDemographics = {
        "miner": shafts,
        // "workerBee" : shafts,
        "private": 7,
        "technician": 15
    }
}

function lvl3room(room) {

    var roomConfig = room.memory.strategy;
    var shafts = _.keys(room.memory.shafts).length;

    roomConfig.minDemographics = {
            "workerBee": shafts,
            "miner": shafts,
        } // No mins, the goalDemo and max will
        // control build order this early in room

    roomConfig.maxDemographics = {
        "miner": shafts,
        // "workerBee" : shafts,
        "private": 7,
        "technician": 15
    }
}

function lvl4room(room) { // build storage
}

function lvl5room(room) {}

function lvl6room(room) {}

function lvl7room(room) {}
function lvl8room(room) {}