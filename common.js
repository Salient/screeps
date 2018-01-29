/**
 * 
 */

module.exports.myName = Game.spawns[Object.keys(Game.spawns)[0]].owner.username;


function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}
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


function dlog(module, msg) {
    // var from = name;
    console.log('[DEBUG ' + module + "] " + msg);
}

module.exports.dlog = dlog;

module.exports.dumpObject = function(obj) {
    dlog('JS OBJ', 'Dumping Object...');
    for (var x in obj) {
        dlog('JS OBJ', 'Key: ' + x + ', value ' + obj[x] + '.');
    }
}


var def = function(obj) {
    return (obj === false) ? false : !!obj;
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

Creep.prototype.leaveRoom = function(dest = "") {
    // TODO
    // maybe add optional flags to head toward or away from captial?

    this.say('💢');
    if (this.currentTask != 'leaveroom') {
        this.addTask('leaveroom');
    }


    if (dest != "") {
        // New pilrgimage starting

        if (this.room.name == dest) {
            ///uhh guess i'm already here? what?
            dlog(creep.name + 'wants to leave to the room its already in');
            //  this.memory.taskList.pop();
            return false;
        }

        var interRoomRoute = Game.map.findRoute(creep.room.name, dest);

        if (interRoomRoute == ERR_NO_PATH) {
            //this.memory.taskList.pop();
            dlog('interroom routing error');
            return false;
        }

        if (interRoomRoute.length > 0) {

            this.memory.wanderlust = {
                route: interRoomRoute
            }
        } else {
            dlog('very sratnge interroom routing error');
            return false;
        }
    } else {
        // Supposed to pick a random exit

        var adjRooms = shuffle(Game.map.describeExits(this.room));
        var randAdjRoom = adjRooms[Object.keys(adjRooms)[0]];

        this.memory.wanderlust = {
            route: {
                room: randAdjRoom,
                exit: Object.keys(adjRooms)[0]
            }
        }
    }


    if (!def(this.memory.wanderlust) || !def(this.memory.wanderlust.route)) {
        dlog('told to leave room but I dont remember where to');
        this.memory.taskList.pop();
        return false;
    }

    var lustRoute = this.memory.wanderlust.route;

    if (this.room.name == lustRoute[0].room) {
        //made it to the next room. 

        if (lustRoute.length == 1) {
            // this is the destination
            this.room.classify();
            this.memory.taskList.pop();
            delete this.memory.wanderlust;
            return true;
        }
        lustRoute.shift();
    }

    var movePos = new RoomPosition(25, 25, lustRoute[0].room);

    var derp = creep.moveTo(movePos, {
        reusePath: 15,
        visualizePathStyle: {
            stroke: '41ff166'
        }
    });

    switch (res) {
        case OK:
        case ERR_TIRED:
            return true
            break;
        default:
            dlog('trouble with interrom');
    }

    return;

    if (!def(this.memory.wanderlust)) {
        this.memory.wanderlust = {};
    }

    var lust = this.memory.wanderlust;

    if (!def(lust.start)) {

        //       dlog('COMMON', this.name + ' now leaving room');
        if (dest == 'home') {
            this.taskState = 'RETURNING'
            var exits = this.room.find(Game.map.findExit(creep.room, creep.memory.birthRoom));
        } else {
            this.taskState = 'LEAVING';
            var exits = this.room.find(FIND_EXIT);
        }

        lust.start = this.room.name;

        if (exits.length > 1) {
            lust.end = exits[Math.floor(Math.random() * exits.length)];
        } else {
            lust.end = exits[0];
        }
    }

    if (this.room.name == lust.start) {
        // Still here on our way out 
        var waypoint = new RoomPosition(lust.end.x, lust.end.y, lust.end.roomName);
        var res = this.moveTo(waypoint);
        switch (res) {
            case OK:
            case ERR_TIRED:
                return true;
                break;
            default:
                dlog('COMMON', this.name + ' Error leaving room: ' + res)
                return false;
        }
        dlog('COMMON', this.name + ' on my way out');
    } else {
        // we have arrived
        //  dlog('COMMON',this.name + ' arrived in different room');
        this.memory.taskList.pop();
        delete this.memory.wanderlust.start;
        delete this.memory.wanderlust.end;
        return false;
    }
    dlog('uhhhhh')
}