"use strict";

/*global module, require*/

/*
 Takes:
 + Two points start and end.
 + A direction vector indicating the direction in which the graph is being laid out.
 + Optionallty, a list of points to act as control points. If this is not present, will attempt to work out some sensible control points.

 Returns a list of points which form a curved path.

 This can be passed to the edge view model, or to d3.svg.line().interpolate("basis").
 */
module.exports = function(start, end, orientationCoords, controlPoints) {
    var path = [];
    
    path.push(start);

    if (controlPoints) {
	path = path.concat(controlPoints);
	
    } else {
	if (end[0] < start[0]) {
	    /*
	     Add extra control points to give us an S-shape.

	     Worked out on a fairly ad-hoc basis, but seems to give mostly good results.
	     */
	    var xScale = end[0] - start[0],
		yScale = end[1] - start[1],
		xOffset = xScale / 5,
		yOffset = yScale / 10,
		midY = (start[1] + end[1]) / 2;
	    
	    path.push([
		start[0] - xOffset,
		start[1] + yOffset
	    ]);
	    
	    path.push([
		start[0] - xOffset,
		midY
	    ]);

	    path.push([
		end[0] + xOffset,
		midY
	    ]);
	    
	    path.push([
		end[0] + xOffset,
		end[1] - yOffset
	    ]);
	    
	} else {
	    /*
	     Add an extra control point to give us a nice curve.
	     */
	    path.push([
		(start[0] + end[0]) / 2,
		end[1]
	    ]);
	}
    }

    path.push(end);

    return path;
};

