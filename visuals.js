// Various visual aids for seeing what is going on
//
var util = require('common');

Room.prototype.visualizeMainPaths = function() {

    if (!util.def(this.memory.infrastructure) || !util.def(this.memory.infrastructure.paths)) {
        return false;
    }

    var paths = this.memory.infrastructure.paths;

    for (var path in paths) {
        for (var step in paths[path]) {
            if (step == Number(paths[path].length) - 1) {
                break;
            }

            var stone = paths[path][step];
            var stun = paths[path][Number(step) + 1];
            this.visual.line(stone.x, stone.y, stun.x, stun.y,
                {
                    width: 0.2,
                    color: '#ffff22',
                    opacity: 0.2,
                    //     lineStyle: 
                });

            //        this.visual.circle(stone.x, stone.y, {
            //            fill: 'solid',
            //            radius: 0.15,
            //            stroke: 'red'
            //        });
        }
    }
}

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
                    vis.circle(+xval, +yval, {
                        fill: '#2277FF'
                    })
                }
            }
        }
    }
}


module.exports = function(room) {
    showFutureRoads(room);
    room.visualizeMainPaths();
    // room.placeNeoExtensions();
}
