"use strict";

/*global module, require*/

var _ = require("lodash"),
    d3 = require("d3");

module.exports = function(nodeIds, parentsForNode, onNodeCreate, onNodeDelete, onEdgeCreate, onEdgeDelete) {
    var depths = [],

	calculate = function() {
	    var depthById = d3.map(),

		findDepthRecursive = function(id) {
		    if (depthById.has(id)) {
			return depthById.get(id);
		    }

		    /*
		     Find the depths of all my parents, then take the smallest of those and add one to it to find my depth.
		     */
		    var parentDepths = parentsForNode(id).map(findDepthRecursive),
			myDepth = (parentDepths.length === 0) ? 1 : (_.min(parentDepths) + 1);

		    depthById.set(id, myDepth);
		    return myDepth;
		};

	    nodeIds().forEach(findDepthRecursive);

	    depths = [];

	    depthById.forEach(function(id, depth) {
		if (depths[depth - 1]) {
		    depths[depth - 1].add(id);
		} else {
		    depths[depth - 1] = d3.set([id]);
		}
	    });
	};

    onNodeCreate(calculate);
    onNodeDelete(calculate);
    onEdgeCreate(calculate);
    onEdgeDelete(calculate);
    
    return {
	getMaxDepth: function() {
	    return depths.length;
	},

	getVisibleIds: function(depth) {
	    var sliceLength = (depth === null) ?
		    depths.length :
		    Math.min(depths.length, depth);

	    return d3.set(
		_.union.apply(
		    this,
		    depths.slice(0, sliceLength).map(function(set) {
			return set.values();
		    })
		)
	    );
	},

	isBorderNode: function(depth, id) {
	    if (depth === null) {
		return false;
	    } else {
		var i = Math.min(depth, depths.length) - 1;
		return depths[i].has(id);
	    }
	}
    };
};
