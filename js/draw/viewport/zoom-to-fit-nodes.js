"use strict";

/*global module, require*/

var d3 = require("d3"),
    tolerance = 50;

/*
 The model will zoom to a bbox which fits the supplied node ids.
 */
module.exports = function(svg, zoom, getSVGNodes) {
    var calcExtent = function(nodeIds) {
	var bbox;
	
	getSVGNodes()
	    .filter(function(d, i) {
		return !d3.select(this).classed("removing");
	    })
	    .each(function(d, i) {
		if (nodeIds.has(d.id)) {
		    var right = d.x + d.size[0],
			bottom = d.y + d.size[1];
		    
		    if (bbox === undefined) {
			bbox = {
			    left: d.x,
			    right: right,
			    top: d.y,
			    bottom: bottom
			};
		    } else {
			if (bbox.left > d.x) {
			    bbox.left = d.x;
			}

			if (bbox.right < right) {
			    bbox.right = right;
			}
			
			if (bbox.top > d.y) {
			    bbox.top = d.y;
			}

			
			if (bbox.bottom < bottom) {
			    bbox.bottom = bottom;
			}
		    }
		}
	    });

	if (bbox) {
	    bbox.left -= tolerance;
	    bbox.right += tolerance;
	    bbox.top -= tolerance;
	    bbox.bottom += tolerance;

	    bbox.width = bbox.right - bbox.left;
	    bbox.height = bbox.bottom - bbox.top;
	}

	return bbox;
    };

    return function(nodeIdSet) {
	if (!nodeIdSet) {
	    throw new Error("nodeIdSet should be a d3 set of ids for nodes which we want to be displayed on the screen.");
	}
	
	var modelExtent = calcExtent(nodeIdSet);

	if (modelExtent) {
	    zoom.bbox(modelExtent);
	}
    };
};
