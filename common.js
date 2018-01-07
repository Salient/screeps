/**
 * 
 */

var getError = function(result) {

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

module.exports.getError = getError;

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


Creep.prototype.leaveRoom = function(dest = "") {
    // TODO
    // maybe add optional flags to head toward or away from captial?

    if (!def(this.memory.wanderlust)) {
        this.memory.wanderlust = {};
    }

    var lust = this.memory.wanderlust;

    if (!def(lust.start)) {
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
        this.addTask('leaveroom');
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
                dlog(this.name + ' Error leaving room: ' + getError)
                return false;
        }
    } else {
        // we have arrived
        delete this.memory.wanderlust.start;
        delete this.memory.wanderlust.end;
        return false;
    }
    dlog('uhhhhh')
}