// Various visual aids for seeing what is going on
//
var util = require('common');

function showFutureRoads(room) {

    if (!util.def(room.memory.planned)) {
        return;
    }


    var heatm = room.memory.heatmap;

    if (!util.def(heatm)) {
        return
    }
    for (var x = 1; x < 49; x++) {
        for (var y = 1; y < 49; y++) {
            if (heatm[x][y] > 15) {
                room.visual.circle(x, y, {
                    fill: '#777700'
                })
            }
        }
    }
}

module.exports = function show(room) {
    showFutureRoads(room);
}
