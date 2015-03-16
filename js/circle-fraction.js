"use strict";

/*global module*/

var tau = Math.PI * 2,
    halfPi = Math.PI / 2;

/*
 Given an SVG element and a d3 event, works out how far anti-clockwise from the centre the mouse cursor is relative to the centre of the element.

 Ranges from 0 to 1.
 */
module.exports = function(element, event) {
    var bbox = element.getBBox(),
	xOffset = event.x - (bbox.x + (bbox.width / 2)),
	yOffset = event.y - (bbox.y + (bbox.height / 2)),

	// Inverse tan's range is annoying, so we correct for that here.
	quadrantCorrection = xOffset >= 0 ?
	    (yOffset >= 0 ? 0.5 : 1)
	: (yOffset >= 0 ? 0.5 : 0),
	
	// Identify the angle relative to vertical.
	angle = yOffset === 0 ?
	    Math.sign(xOffset) * halfPi
	    : Math.atan(xOffset / yOffset);

    // Calculate the fraction of the circle which the angle covers.
    return (angle / tau) + quadrantCorrection;
};
