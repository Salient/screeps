/**
 * 
 */

module.exports.purgeOldConstruction = function() {
    for (var site in Game.constructionSites) {
        var thisSite = Game.getObjectById(site);
        if (!thisSite.room){
            thisSite.remove();
        }
    }
}

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

    if (!def(this.memory.wanderlust) || !def(this.memory.wanderlust.route)) {
        if (dest) {
            // New pilrgimage starting

            if (this.room.name == dest) {
                ///uhh guess i'm already here? what?
                this.log('wants to leave to the room its already in');
                //  this.memory.taskList.pop();
                return false;
            }

            var interRoomRoute = Game.map.findRoute(this.room.name, dest, {
                routeCallback(roomName, fromRoomName) {
                    if (Memory.Overmind.globalTerrain[roomName] && Memory.Overmind.globalTerrain[roomName].score) {
                        if (Memory.Overmind.globalTerrain[roomName].score > 0) {
                            return 1;
                        } else {
                            return (-Memory.Overmind.globalTerrain[roomName].score);
                        }
                    } else {
                        return 1
                    };
                }
            });

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
            // seedlings should prefer unscored rooms
            // solders should prefer lower scored rooms

            var adjRooms = shuffle(Game.map.describeExits(this.room.name));
            var randomExit = {
                room: adjRooms[Object.keys(adjRooms)[0]],
                exit: Object.keys(adjRooms)[0]
            }

            if (!Memory.Overmind.globalTerrain[randomExit]) {
                Memory.Overmind.globalTerrain[randomExit] = {
                    score: 0,
                    revised: 0
                }
            }

            var score = Memory.Overmind.globalTerrain[randomExit].score;

            for (var option in adjRooms) {
                var exit = adjRooms[option];
                // this.log('choosing eit from room. choices: ' + adjRooms);
                // dumpObject(adjRooms)
                // this.log('current choice: ' + exit)
                if (Memory.Overmind.globalTerrain[exit] && Memory.Overmind.globalTerrain[exit].score > 0 && Memory.Overmind.globalTerrain[exit].revised > Game.time - 300) {

                    var storedScore = Memory.Overmind.globalTerrain[exit].score;
                    if (storedScore > score && this.role == 'worker') {
                        score = storedScore;

                        //this.log('testing ' + exit + ' with score ' + score)
                        randomExit = {
                            room: exit,
                            exit: option
                        }
                    }
                } else if (this.role == 'seedling' || this.role == 'scout') {
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
            // this.log(' selecting new exit from room. (' + randomExit.room + '), score:' + score);
            //            dumpObject(randomExit);
            this.memory.wanderlust = {
                route: [randomExit],
                trail: [this.room.name]
            }
        }
    }
    var lustRoute = this.memory.wanderlust.route;

    if (!lustRoute) {
        delete this.memory.wanderlust;
        return false;
    }

    if (this.room.name == lustRoute[0].room) {
        if (!this.memory.wanderlust.trail) {
            this.memory.wanderlust.trail = [];
        }

        this.memory.wanderlust.trail.push(this.room.name);
        //made it to the next room. 
        // need to move away from exit or forever roam the halls of infitite mirrors
        this.moveAwayFromExit();
        this.room.classify();

        if (this.role == 'seedling') {
            this.log('entered room on way to ' + lustRoute[lustRoute.length - 1].room);
        }

        if (lustRoute.length == 1) {
            // this is the destination
            // this.log('at elaveroom dest')
            this.memory.taskList.pop();
            delete this.memory.wanderlust.route;
            return false;
        } else {
            // this.log('at next hop, currently in ' + lustRoute[0].room + ' on the way to ' + lustRoute[lustRoute.length - 1].room);
            lustRoute.shift();
            if (this.memory.role == 'worker') {
                this.changeTask('builder'); // stimulate the local economy
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
            stroke: '#FFFFFF',
            opacity: 1
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
        case ERR_NO_PATH:
            this.log('hrm, so i have a problem here. destination is ' + lustRoute[lustRoute.length - 1].room);
            this.log('my current room is ' + this.room.name)
                // force reroute 
            var finalDest = lustRoute[lustRoute.length - 1].room;
            delete this.memory.wanderlust;
            // return this.leaveRoom(finalDest);
            this.log('lollddorcopter')
        default:
            this.log(' trouble with interrom move : ' + derp + ', dest: ' + nextHop.room);

            // this.log('route: ' + dumpObject(lustRoute))
            // this.log('first: ' + dumpObject(lustRoute[0]))
            // dumpObject(lustRoute[0])
            if (!Memory.Overmind.globalTerrain[lustRoute[0].room] && Game.rooms[lustRoute[0].room]) {
                Game.rooms[lustRout[0].room].classify();
            }
            Memory.Overmind.globalTerrain[lustRoute[0].room].score -= 20;
            delete this.memory.wanderlust;
            //  this.moveAwayFromExit();
            this.moveRandom();
            return true;
            // delete this.memory.wanderlust;
    }
    return false;
}



module.exports.spiral = function (n) {
    // given n an index in the squared spiral
    // p the sum of point in inner square
    // a the position on the current square
    // n = p + a

    var r = Math.floor((Math.sqrt(n + 1) - 1) / 2) + 1;

    // compute radius : inverse arithmetic sum of 8+16+24+...=
    var p = (8 * r * (r - 1)) / 2;
    // compute total point on radius -1 : arithmetic sum of 8+16+24+...

    var en = r * 2;
    // points by face

    var a = (1 + n - p) % (r * 8);
    // compute de position and shift it so the first is (-r,-r) but (-r+1,-r)
    // so square can connect

    var pos = [0, 0, r];
    switch (Math.floor(a / (r * 2))) {
        // find the face : 0 top, 1 right, 2, bottom, 3 left
        case 0:
            {
                pos[0] = a - r;
                pos[1] = -r;
            }
            break;
        case 1:
            {
                pos[0] = r;
                pos[1] = (a % en) - r;

            }
            break;
        case 2:
            {
                pos[0] = r - (a % en);
                pos[1] = r;
            }
            break;
        case 3:
            {
                pos[0] = -r;
                pos[1] = r - (a % en);
            }
            break;
    }
    // console.log("n : ", n, " r : ", r, " p : ", p, " a : ", a, "  -->  ", pos);
    return pos;
}

