var util = require('common')


if (!util.def(Memory.Overmind)) {

    Memory.Overmind = {
        roomScores: {},
    }
}

Room.prototype.scoreRoom = function() {

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
        var srcDist = srcs[0].pos.findPathTo(srcs[1]);
    }

    Memory.Overmind.roomScores[this.name] = srcs * 10 + exits * 3 + ore *10  - (nmes * 5 + anathem *10 + mustdie *20);

}
