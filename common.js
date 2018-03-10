/**
 * 
 */

module.exports.myName = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;

Creep.prototype.log = function(msg) {
    console.log(this.name + '/' + this.room.name + '/' + this.currentTask + ': ' + msg);
}

Room.prototype.log = function(msg) {
    console.log("(debug) " + this.name + ': ' + msg);
}

var shuffle = function(o) {
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

module.exports.shuffle = shuffle;

module.exports.getError = function(result) {

    var errorCodes = {
        "0": "OK",
        "-1": "ERR_NOT_OWNER",
        "-2": "ERR_NO_PATH",
        "-3": "ERR_NAME_EXISTS",
        "-4": "ERR_BUSY",
        "-5": "ERR_NOT_FOUND",
        "-6": "ERR_NOT_ENOUGH_ENERGY",
        "-7": "ERR_INVALID_TARGET",
        "-8": "ERR_FULL",
        "-9": "ERR_NOT_IN_RANGE",
        "-10": "ERR_INVALID_ARGS",
        "-11": "ERR_TIRED",
        "-12": "ERR_NO_BODYPART",
        "-13": "ERR_NOT_ENOUGH_EXTENSIONS",
        "-14": "ERR_RCL_NOT_ENOUGH",
        "-15": "ERR_GCL_NOT_ENOUGH"
    }
    var retVal = errorCodes[result];
    if (typeof retVal === 'undefined' || (retVal == null)) {
        return "Ironic Error!?!?";
    } else {
        return retVal;
    }
}

module.exports.getRand = function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}


// Return object with top,left,bottom,right properties a la  room position index within boundaries up to [margin] away
module.exports.bound = function bound(pos, margin = 1) {
    return {
        top: (pos.y < margin) ? 1 : pos.y - margin,
        left: (pos.x < margin) ? 1 : pos.x - margin,
        bottom: (pos.y + margin <= 49) ? pos.y + margin : 49,
        right: (pos.x + margin <= 49) ? pos.x + margin : 49
    }
}

function dlog(module, msg) {
    // var from = name;
    console.log('[DEBUG ' + module + "] " + msg);
}

module.exports.dlog = dlog;

var dumpObject = function(obj) {
    dlog('JS OBJ', 'Dumping Object...');
    for (var x in obj) {
        dlog('JS OBJ', 'Key: ' + x + ', value ' + obj[x] + '.');
    }
}

module.exports.dumpObject = dumpObject;
module.exports.dumpObj = dumpObject;

var def = function(obj) {
    //  return (obj === false) ? false : !!obj;
    return (obj === false) ? true : (obj === undefined || obj === null) ? false : true;

    return !!obj;
    //	if ((typeof obj !== undefined) || (obj === null)) {
    //		return false;
    //	}
    //    return true 
}

module.exports.def = def;

module.exports.sequence = [{
    x: -1,
    y: -1
}, {
    x: 0,
    y: -1
}, {
    x: 1,
    y: -1
}, {
    x: -1,
    y: 0
}, {
    x: 1,
    y: 0
}, {
    x: 1,
    y: -1
}, {
    x: 1,
    y: 0
}, {
    x: 1,
    y: 1
}];

Creep.prototype.moveAwayFromExit = function() {

    var pos = this.pos;
    var movedir = null;
    if (pos.x == 0) {
        movedir = RIGHT;
    } else if (pos.x == 49) {
        movedir = LEFT;
    } else if (pos.y == 0) {
        movedir = BOTTOM;
    } else {
        movedir = TOP;
    }

    if (!movedir) {
        this.log('stf');
    }
    var res = this.move(movedir);
    // this.log(this.name + ' moved away, res: ' + res)
}

Creep.prototype.moveRandom = function() {
    this.move(Math.floor(Math.random() * (8) + 1)); //The maximum is inclusive and the minimum is inclusive 
}

Creep.prototype.leaveRoom = function(dest = "") {
    // TODO
    // maybe add optional flags to head toward or away from captial?

    this.say('💢');
    if (this.currentTask != 'leaveroom') {
        this.addTask('leaveroom');
    }

    // Check if already set up
    //     this.log(this.name + '/' + this.room.name, ' leave room called, dest: ' + dest);

    if (!def(this.memory.wanderlust)) {
        if (dest) {
            // New pilrgimage starting

            if (this.room.name == dest) {
                ///uhh guess i'm already here? what?
                this.log(this.name + 'wants to leave to the room its already in');
                //  this.memory.taskList.pop();
                return false;
            }

            var interRoomRoute = Game.map.findRoute(this.room.name, dest);

            if (interRoomRoute == ERR_NO_PATH) {
                //this.memory.taskList.pop();
                this.log('interroom routing error, trying to leave,  no path?');
                return false;
            }

            if (interRoomRoute.length > 0) {

                this.memory.wanderlust = {
                    route: interRoomRoute
                }
            } else {
                this.log('very sratnge interroom routing error');
                return false;
            }
        } else {
            //             return false;
            // Supposed to pick a random exit

            //            var roomChoice = {
            //                "name": null,
            //                "score": 0,
            //                "exit": null
            //            };
            //


            // Workers should prefer higher scored rooms
            // Scouts should prefer unscored rooms
            // solders should prefer lower scored rooms

            var adjRooms = shuffle(Game.map.describeExits(this.room.name));
            var randomExit = {
                room: adjRooms[Object.keys(adjRooms)[0]],
                exit: Object.keys(adjRooms)[0]
            }


            for (var option in adjRooms) {
                var exit = adjRooms[option];
                if (Memory.Overmind.globalTerrain[exit] && Memory.Overmind.globalTerrain[exit.score] > 0) {
                    var storedScore = Memory.Overmind.globalTerrain[exit].score;
                    if (storedScore > score && this.role == 'worker') {
                        score = storedScore;

                        //this.log('testing ' + exit + ' with score ' + score)
                        randomExit = {
                            room: exit,
                            exit: option
                        }
                    }
                } else if (this.role == 'scout') {
                    randomExit = {
                        room: exit,
                        exit: option
                    }
                }
            }

            //
            //            for (var rr in adjRooms) {
            //                if (Memory.Overmind && Memory.Overmind.globalTerrain && Memory.Overmind.globalTerrain[adjRooms[rr]] && Memory.Overmind.globalTerrain[adjRooms[rr]].score > 0) {
            //                    var option = Memory.Overmind.globalTerrain[adjRooms[rr]].score;
            //                    if (option > roomChoice.score) {
            //                        roomChoice.name = adjRooms[rr];
            //                        roomChoice.score = option;
            //                        roomChoice.exit = rr;
            //                    }
            //                }
            //            }
            //            if (!roomChoice.name) {
            //                roomChoice.name = adjRooms[Object.keys(adjRooms)[0]];
            //            }
            //
            this.log(' selecting new exit from room. (' + randomExit.room + '), score:' + score);
            //            dumpObject(randomExit);
            this.memory.wanderlust = {
                route: [randomExit]
            }
        }
    }
    var lustRoute = this.memory.wanderlust.route;

    if (this.room.name == lustRoute[0].room) {
        //made it to the next room. 
        // need to move away from exit or forever roam the halls of infitite mirrors
        this.moveAwayFromExit();
        this.room.classify();

        if (this.role == 'scout') {
            this.log('eterend room on way to ' + lustRoute[lustRoute.length- 1].room);
        }

        if (lustRoute.length == 1) {
            // this is the destination
            // this.log('at elaveroom dest')
            this.memory.taskList.pop();
            delete this.memory.wanderlust;
            return false;
        } else {
            // this.log(this.name, 'at next hop, currently in ' + lustRoute[0].room + ' on the way to ' + lustRoute[lustRoute.length - 1].room);
            lustRoute.shift();
            if (this.memory.role == 'worker') {
                this.addTask('builder'); // stimulate the local economy
            }
        }
    }


    var nextHop = lustRoute[0];
    if (!def(nextHop.exitPos)) {
        this.memory.wanderlust.route[0].exitPos = this.pos.findClosestByRange(parseInt(nextHop.exit));
    }

    var newRoomPos = new RoomPosition(nextHop.exitPos.x, nextHop.exitPos.y, nextHop.exitPos.roomName);

    var derp = this.moveTo(newRoomPos, {
        reusePath: 15,
        visualizePathStyle: {
            stroke: '41ff166'
        }
    });

    switch (derp) {
        case OK:
        case ERR_TIRED:
            return true
            break;
        case ERR_NO_BODYPART:
            this.log('awww sucks');
            this.suicide();
            return false;
            break;
        default:
            this.log(' trouble with interrom move : ' + derp + ', dest: ' + nextHop.room);
            //  this.moveAwayFromExit();
            this.moveRandom();
            return true;
            // delete this.memory.wanderlust;
    }
    return false;
}