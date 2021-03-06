var util = require('common')

Creep.prototype.focusBuild = function(siteId) {

    if ((this.getActiveBodyparts(CARRY) == 0) || (this.getActiveBodyparts(WORK) == 0)) {
        return false;
    }
    this.memory.bTarget = siteId;
    this.taskState = "SPECIAL";
    this.changeTask("builder");

    this.log("mind dominated to build something");
    return true;
}

Creep.prototype.exploreNewRoom = function() {

    //    if (!util.def(Memory.Overmind)) {
    //        Memory.Overmind = {};
    //    }
    //
    //    var omd = Memory.Overmind;
    //
    //    if (!util.def(omd.knownRooms)) {
    //        omd.knownRooms = {};
    //    }
    //
    //    var knownRooms = omd.knownRooms;
    //

    var curRoom = this.room.name;

    // homesick check
    var wanderdistance = Game.map.getRoomLinearDistance(curRoom, this.memory.birthRoom);
    if (wanderdistance > 5) {
        dlog(this.name + 'is feeling homesick')
        this.memory.taskList.pop();
        this.leaveRoom(this.memory.birthRoom);
        return true;
    }

    var adjRooms = Game.map.describeExits(curRoom);

    var fallback = adjRooms[Object.keys(util.shuffle(adjRooms))[0]];

    for (var dir in adjRooms) {
        var adjRoomName = adjRooms[dir];
        if (Memory.Overmind.globalTerrain[adjRoomName]) {
            continue;
        }
        dlog(this.name + '(' + this.room.name + ') going off to explore ' + adjRoomName);
        this.leaveRoom(adjRoomName);
        return true;
    }

    dlog(this.name + '(' + this.room.name + ')  wants to explore new room, but no adjacent room is unexplored. going to move to ' + fallback + ' and then try again');
    //this.addTask('explore');
    this.leaveRoom(fallback);
    return true;
}

Room.prototype.classify = function() {

    // dlog('classifying '+ this.name + ',')
    var roomRec = Memory.Overmind.globalTerrain[this.name];

    if (util.def(roomRec) && roomRec.revised) {

        if (roomRec.revised > Game.time - 300) {
            // dlog('skipping classification of ' + this.name + ' because its been less than a minute')
            return;
        }

    }
    var classification = {};

    if (!util.def(this.controller)) {
        classification.class = 'wasteland';
    } else if (this.controller.level > 0) {
        //somebody owns this room
        if (this.controller.my) {
            classification.class = 'conquered'; // oh cool, I own it
        } else {
            classification.class = 'heathens';
        }
    } else if (this.controller.reservation) {
        var res = this.controller.reservation.username;
        if (res == util.myName) {
            classification.class = 'annexed';
        } else {
            classification.class = 'threat';
        }
    } else {
        classification.class = "freerange";
    }

    classification.score = this.score();
    // dlog('score for ' + this.name + ': ' + classification.score)
    classification.revised = Game.time + util.getRand(1, 40); // randomize classificaiton calls
    Memory.Overmind.globalTerrain[this.name] = classification;
}


Room.prototype.score = function() {

    if (!Memory.homeworld) {
        Memory.homeworld = this.name;
    }

    var nmes = this.find(FIND_HOSTILE_CREEPS);
    var srcs = this.find(FIND_SOURCES);
    var anathem = this.find(FIND_HOSTILE_STRUCTURES);
    var mustdie = this.find(FIND_HOSTILE_SPAWNS);
    var ore = this.find(FIND_MINERALS);
    var exits = Game.map.describeExits(this.name);
    var conweight = 1;

    var mapDistance = Game.map.getRoomLinearDistance(Memory.homeworld, this.name);
    if (mapDistance == 0) { // This is the home world
        mapDistance = 1;
    }
    var ctrl = this.controller;

    if (!util.def(ctrl)) {
        conweight = 0;
    } else {
        if (ctrl.level > 0) {
            //somebody owns this room
            conweight = 0.25;
        } else if (ctrl.reservation) {
            var res = ctrl.reservation.username;
            if (res == util.myName) {
                conweight = 1 - (ctrl.reservation.ticksToEnd / 5000);
            } else {
                conweight = 0.75;
            }
        }
    }

    if (srcs.length > 1) {
        var srcDist = srcs[0].pos.findPathTo(srcs[1]).length;
        //dlog('srcs dist: ' + srcDist)
    } else {
        srcDist = 0;
    }

    if (srcs.length > 0 && this.controller) {
        var ctrlDist = srcs[0].pos.findPathTo(this.controller).length;
        //dlog('ctrl dist: ' + ctrlDist)
    } else {
        var ctrlDist = 0;
    }

    var bonus = 0;
    if (conweight == 0) { // linear offset
        bonus = 100
    };
    // dlog('exits ' + Object.keys(exits).length)

    // dlog('nme' + nmes.length + ', srcs:' + srcs.length + ', anathem: ' + anathem.length+ ' mustdie: ' + mustdie.length + ', ore: ' + ore.length + ', exits:' + Object.keys(exits).length + ', srcDist: ' + srcDist + ', ctrlDist: ' + ctrlDist);
    var score = ((((srcs.length * 30) + (Object.keys(exits).length) * 50 + 100) - (srcDist + ctrlDist) * 2 + ore.length * 10) / (mapDistance * 2) * conweight - (nmes.length * 50 + anathem.length * 100 + mustdie.length * 200)) + bonus;
    //this.log("calculating score. variables: " +    'sources: ' + srcs.length + ', exits: ' + (Object.keys(exits).length + ', conweight: ' + conweight + ', srcdist: ' + srcDist + ', ctrldist: ' + ctrlDist + ', ore: ' + ore.length + ', nmes:  ' + nmes.length + ', anathem: ' + anathem.length + ', mustdie: ' + mustdie.length + ', mapdist ' + mapDistance) + ', bonus: ' + bonus + '. final score ' + score);
    // dlog('score is ' + score)
    // dlog('scoring room ' + this.name + ' ' + score)
    return score;

}

module.exports.getPriority = function() {

    var level = Game.gcl.level;

    var myRooms = 0;
    var myRes = 0;

    var overmind = Memory.Overmind;
    if (!overmind || !overmind.globalTerrain) {
        Memory.Overmind = {
            globalTerrain: {}
        }
    }
    for (var r in Game.rooms) {
        var room = Game.rooms[r];

        if (!util.def(room.controller)) {
            continue;
        }

        var score = overmind.globalTerrain[r];
        if (!score || score.revised < (Game.time - 300)) {
            room.classify();
        }

        if (room.controller.level > 0) {
            // someone owns it

            if (room.controller.my) {
                myRooms++;
                continue;
            }

        } else if (room.controller.reservation) {
            var myname = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;
            if (room.controller.reservation.username == myname) {
                myRes++;
            }
        }
    }


    var ark = Object.keys(Memory.Overmind.globalTerrain);
    var arr = ark.sort(function(a, b) {
        var x = Memory.Overmind.globalTerrain[a];
        var y = Memory.Overmind.globalTerrain[b];

        if (x.score > y.score) {
            return -1
        }
        if (x.score < y.score) {
            return 1
        }
        return 0;
    });


    var limit = (ark.length > 3) ? 3 : ark.length;
    // dlog('priority returns ');
    // util.dumpObj(candidates.slice(0, limit))
    return ark.slice(0, limit);

    //dlog('global survey - GCL:' + level + ' owned rooms: ' + myRooms + ', reservations: ' + myRes);

    //    var candidates = [];
    //    // target a new room
    //    //TODO - modify some metric here to dcreate more scouts 
    //
    //    var selectList = ["annexed", "freerange", "threat"];
    //
    //    for (var rclass in selectList) {
    //        var targets = roomSelect(selectList[rclass]);
    //        if (targets) {
    //            for (var ind in targets) {
    //                candidates.push(targets[ind]);
    //            }
    //        }
    //        if (candidates.length > 3) {
    //            break;
    //        }
    //    }
    //
    //    //dlog("c3" + candidates);
    //    candidates
    //        .sort(function(a, b) {
    //            if (a.score > b.score) {
    //                return 1;
    //            }
    //            if (a.score < b.score) {
    //                return -1;
    //            }
    //            return 0;
    //        });
    //
    //    //dlog("c4" + candidates);
    //
    //    if (candidates.length == 0) {
    //        return false;
    //    }
    //
    //    var limit = (candidates.length > 3) ? 3 : candidates.length;
    //    // dlog('priority returns ');
    //    // util.dumpObj(candidates.slice(0, limit))
    //    return candidates.slice(0, limit);
    //
    //
    //    // if (myRes < 3) {
    //    // go reaserve a new room
    //
    //
    //    dlog('getpri' + candidates.length)
    //    if (candidates.length < 3) {
    //        candidates.concat(roomSelect("freerange"));
    //    }
    //
    //    if (candidates.length < 3) {
    //        candidates.concat(roomSelect("threat"));
    //    }
    //
    //
    //    candidates
    //        .sort(function(a, b) {
    //            if (a.score > b.score) {
    //                return 1;
    //            }
    //            if (a.score < b.score) {
    //                return -1;
    //            }
    //            return 0;
    //        });

    // }

    // add more to an existing reservation
    // TODO - modify some metric here to create less scouts
}

function roomSelect(rClass) {

    if (!util.def(Memory.Overmind) || !util.def(Memory.Overmind.globalTerrain)) {
        return false;
    }

    var terrain = Memory.Overmind.globalTerrain;

    // dlog('rclass is ' + rClass)
    var results = [];
    // dlog('terain ' + terrain);
    for (var t in terrain) {
        // dlog('t ' + t)
        if (terrain[t].class == rClass) {
            results.push(t);
        }

    }
    // dlog("selection results are " + results);
    if (results.length > 0) {
        return results;
    }
    return false;
}

function dlog(msg) {
    util.dlog('OVERMIND', msg);
}
