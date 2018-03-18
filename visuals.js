// Various visual aids for seeing what is going on
//
var util = require('common');

function showFutureRoads(room) {
    if (!util.def(room.memory.planned)) {
        return;
    }

    // return;

    var heatm = room.memory.trafficMap;

    if (!util.def(heatm)) {
        console.log('hwl')
        return
    }
var vis = room.visual;
    for (var xval in heatm) {
        for (var yval in heatm[xval]) {
            var spot = heatm[xval][yval];
            // util.dumpObj(spot)
            if (util.def(spot)) {
                // room.log(spot)
                if (spot.heat > 40) {
                    // console.log('dddhwl')
                    vis.circle(xval, yval, {
                        fill: '#2277FF'
                    })
                }
            }
        }
    }
}
module.exports = function(room) {
    showFutureRoads(room);
}
