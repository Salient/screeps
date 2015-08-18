var exports = module.exports = {};

exports.zapZombies = function() {
    for(var i in Memory.creeps) {
        if(!Game.creeps[i]) {
            console.log("[GC] " + i + " (" + Memory.creeps[i].role + ")");
            delete Memory.creeps[i];
        }
    }
}

exports.clearBuildTargets = function() {
    for (var i in Memory.creeps) {
        if (Memory.creeps[i].myTargetId) {
        }
    }
}
