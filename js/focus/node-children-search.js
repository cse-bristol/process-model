"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(getNodeCollection) {
    var findChildIdsAndDepthAccum = function(id, depthLimit, currentDepth, accum, nodes) {
	if (depthLimit !== null && currentDepth > depthLimit) {
	    return;
	} else {
	    if (currentDepth > accum.maxDepthReached) {
		accum.maxDepthReached = currentDepth;
	    }
	}

	if (!nodes.has(id)) {
	    return;
	}
	
	var current = nodes.get(id);

	accum.childIds.set(id, current);
	
	current.edges().forEach(function(e) {
	    if (!accum.childIds.has(e.node().id)) {
		findChildIdsAndDepthAccum(
		    e.node().id,
		    depthLimit,
		    currentDepth + 1,
		    accum,
		    nodes
		);
	    }
	});
    };

    /*
     If depth is not specified, will go as deep as it can.
    */
    return function(id, depthLimit) {
	if (!id) {
	    return {
		childIds: d3.set()
	    };
	}
	
	var accum = {
	    childIds: d3.map(),
	    maxDepthReached: 0
	};

	findChildIdsAndDepthAccum(id, depthLimit, 0, accum, getNodeCollection());
	
	return {
	    childIds: d3.set(
		accum.childIds.keys()),
	    maxDepthReached: accum.maxDepthReached
	};
    };
};
