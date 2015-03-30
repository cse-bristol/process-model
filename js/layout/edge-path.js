"use strict";

/*global module, require*/

var overshootScale = 0.2,

    plus = function(a, b) {
	return [
	    a[0] + b[0],
	    a[1] + b[1]
	];
    },

    minus = function(a, b) {
	return [
	    a[0] - b[0],
	    a[1] - b[1]
	];
    };

/*
 Takes:
 + Two points start and end.
 + A direction vector D indicating the direction in which the graph is being laid out.
 + Optionally, a list of points to act as control points. If this is not present, will attempt to work out some sensible control points.

 Returns a list of points which form a curved path.

 This can be passed to the edge view model, or to d3.svg.line().interpolate("basis").
 */
module.exports = function(start, end, direction, controlPoints) {
    var path = [],
	mix = function(a, b, mix) {
	    path.push([
		(a[0] * mix[0]) + (b[0] * (1 - mix[0])),
		(a[1] * mix[1]) + (b[1] * (1 - mix[1]))
	    ]);
	};	
    
    path.push(start);

    if (controlPoints) {
	path = path.concat(controlPoints);
	
    } else {
	var delta = [
	    end[0] - start[0],
	    end[1] - start[1]
	],
	    mid = [
		(start[0] + end[0]) / 2,
		(start[1] + end[1]) / 2
	    ],

	    absDirection = [
		Math.abs(direction[0]),
		Math.abs(direction[1])
	    ],

	    deltaDotDirection = [
		delta[0] * direction[0],
		delta[1] * direction[1]
	    ];

	if (deltaDotDirection[0] + deltaDotDirection[1] > 0) {
	    /*
	     End is downstream of start with respect to the layout.

	     Add one extra control point between them.

	     This control point will be pushed out orthogonal to the direction of layout to give us a nice curve.
	     */

	    mix(mid, end, absDirection);
	    
	} else {
	    /*
	     Add extra control points to give us an S-shape where we overshoot the ends of the edge slightly. This helps us to avoid drawing a line through the node in many cases.
	     */
	    var overshoot = [
		overshootScale * delta[0],
		overshootScale * delta[1]
	    ],

		/*
		 Orthogonal to the direction of layout, we don't want our control point to reach the end of the edge.

		 This gives a smoother feel.
		*/
		undershoot = [
		    overshoot[0] / 3,
		    overshoot[1] / 3
		],
		
		overshootStart = minus(start, overshoot),
		overshootEnd = plus(end, overshoot);

	    mix(overshootStart, plus(start, undershoot), absDirection);
	    mix(overshootStart, plus(mid, undershoot), absDirection);
	    mix(overshootEnd, minus(mid, undershoot), absDirection);
	    mix(overshootEnd, minus(end, undershoot), absDirection);
	}
    }

    path.push(end);

    return path;
};

