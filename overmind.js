var util = require('common')

Creep.prototype.exploreNewRoom = function() {

    if (!util.def(Memory.Overmind)) {
        Memory.Overmind = {};
    }

    var omd = Memory.Overmind;

    if (!util.def(omd.knownRooms)) {
        omd.knownRooms = {};
    }

    var knownRooms = omd.knownRooms;

    var curRoom = this.room.name;


    var adjRooms = Game.map.describeExits(curRoom);

    util.shuffle(adjRooms);

    for (var dir in adjRooms) {
        var adjRoomName = adjRooms[dir];
        if (omd.knownRooms[adjRoomName]) {
            continue;
        }

        this.leaveRoom(adjRoomName);
    }

    this.leaveRoom(adjRooms[0]);
}

Room.prototype.classify = function() {

    var ovrmnd = Memory.Overmind.globalTerrain;
    if (util.def(ovrmnd) & ovrmnd[this.name] && ovrmnd[this.name].revised) {

        if (ovrmnd[this.name].revised < Game.time + 60) {
            dlog('skipping classification of ' + this.name + ' because its been less than a minute')
        }

    }
    var classification = {};


    if (!util.def(this.controller)) {
        classification.class = 'wasteland';
        return;
    }

    dlog('classifying ' + this.name)
    if (this.controller.level > 0) {
        //somebody owns this room
        if (this.controller.my) {
            classification.class = 'conqured'; // oh cool, I own it
        } else {
            classification.class = 'heathens'; // oh cool, I own it
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
    classification.revised = Game.time;
    Memory.Overmind.globalTerrain[this.name] = classification;
}


Room.prototype.score = function() {

    dlog('scoring room ' + this.name)
    var nmes = this.find(FIND_HOSTILE_CREEPS);
    var srcs = this.find(FIND_SOURCES);
    var anathem = this.find(FIND_HOSTILE_STRUCTURES);
    var mustdie = this.find(FIND_HOSTILE_SPAWNS);
    var ore = this.find(FIND_MINERALS);
    var exits = this.find(FIND_EXIT);

    if (util.def(this.controller)) {
        var ctrl = 1;
    } else {
        var ctrl = 0;
    }

    if (srcs.length > 1) {
        var srcDist = srcs[0].pos.findPathTo(srcs[1]).length;
        dlog('srcs dist: ' + srcDist)
    } else {
        srcDist = 0;
    }

    if (srcs.length > 0) {
        var ctrlDist = srcs[0].pos.findPathTo(this.controller).length;
        dlog('ctrl dist: ' + ctrlDist)
    } else {
        var ctrlDist = 0;
    }

    // dlog('nme' + nmes.length + ', srcs:' + srcs.length + ', anathem: ' + anathem.length+ ' mustdie: ' + mustdie.length + ', ore: ' + ore.length + ', exits:' + exits.length + ', srcDist: ' + srcDist + ', ctrlDist: ' + ctrlDist);
    var score = srcs.length * 10 + exits.length * 3 + ore.length * 10 - 2 * (srcDist + ctrlDist) - (nmes.length * 5 + anathem.length * 10 + mustdie.length * 20);
    dlog('score is ' + score)
    return score;

}

module.exports.getPriority = function() {

    var level = Game.gcl.level;

    var myRooms = 0;
    var myRes = 0;

    var overmind = Memory.Overmind;
    if (overmind || !overmind.globalTerrain) {
        Memory.Overmind = {
            globalTerrain: {}
        }
    }

    dlog('here')
    for (var r in Game.rooms) {
        var room = Game.rooms[r];

        if (!util.def(room.controller)) {
            continue;
        }

        var score = overmind.globalTerrain[r];
        if (!score || score.revised > Game.time + 300) {
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


    if (level > myRooms) {
        // target a new room
        //TODO - modify some metric here to dcreate more scouts 
        var candidates = [];

        var selectList = ["annexed", "freerange", "threat"];

        for (var rclass in selectList) {
            var targets = roomSelect(selectList[rclass]);
            if (targets) {
                candidates.push(targets);
            }
            if (candidates.length > 3) {
                break;
            }
        }

        dlog("c3" + candidates);
        candidates
            .sort(function(a, b) {
                if (a.score > b.score) {
                    return 1;
                }
                if (a.score < b.score) {
                    return -1;
                }
                return 0;
            });

        dlog("c4" + candidates);

        if (candidates.length == 0) {
            return false;
        }

        var limit = (candidates.length > 3) ? 3 : candidates.length;
        return candidates.slice(0, limit);
    }


    // if (myRes < 3) {
    // go reaserve a new room


    if (candidates.length < 3) {
        candidates.concat(roomSelect("freerange"));
    }

    if (candidates.length < 3) {
        candidates.concat(roomSelect("threat"));
    }


    candidates
        .sort(function(a, b) {
            if (a.score > b.score) {
                return 1;
            }
            if (a.score < b.score) {
                return -1;
            }
            return 0;
        });

    // }

    // add more to an existing reservation
    // TODO - modify some metric here to create less scouts
}

function roomSelect(rClass) {

    if (!util.def(Memory.Overmind) || !util.def(Memory.Overmind.globalTerrain)) {
        return false;
    }

    var terrain = Memory.Overmind.globalTerrain;

    dlog('rclass is ' + rClass)
    var results = [];
    dlog('terain ' + terrain);
    for (var t in terrain) {
        dlog('t ' + t)
        if (terrain[t].class == rClass) {
            results.push(t);
        }

    }
    dlog("results are " + results);
    if (results.length > 0) {
        return results;
    }
    return false;
}

function dlog(msg) {
    util.dlog('OVERMIND', msg);
}
