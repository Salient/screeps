/**
 * 
 */

module.exports.getError = function(result) {

	var errorCodes = {
		"0" : "OK",
		"-1" : "ERR_NOT_OWNER",
		"-2" : "ERR_NO_PATH",
		"-3" : "ERR_NAME_EXISTS",
		"-4" : "ERR_BUSY",
		"-5" : "ERR_NOT_FOUND",
		"-6" : "ERR_NOT_ENOUGH_ENERGY",
		"-7" : "ERR_INVALID_TARGET",
		"-8" : "ERR_FULL",
		"-9" : "ERR_NOT_IN_RANGE",
		"-10" : "ERR_INVALID_ARGS",
		"-11" : "ERR_TIRED",
		"-12" : "ERR_NO_BODYPART",
		"-13" : "ERR_NOT_ENOUGH_EXTENSIONS",
		"-14" : "ERR_RCL_NOT_ENOUGH",
		"-15" : "ERR_GCL_NOT_ENOUGH"
	}
	var retVal = errorCodes[result];
	if (typeof retVal === 'undefined' || (retVal == null)) {
		return "Ironic Error!?!?";
	} else {
		return retVal;
	}
}

function dlog(module, msg) {
	// var from = name;
	console.log('[DEBUG ' + module + "] " + msg);
}
module.exports.dlog = dlog;

module.exports.dumpObject = function(obj) {
	dlog('Dumping Object...');
	for ( var x in obj) {
		dlog('Key: ' + x + ', value ' + obj[x] + '.');
	}
}

module.exports.def = function(obj) {
	if ((typeof obj === 'undefined') || (obj == null)) {
		return false;
	}
	return true;
}