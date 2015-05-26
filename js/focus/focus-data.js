"use strict";

/*global module, require*/

module.exports = function() {
    /*
     Depth is how many levels of edges we will follow when accumulating children of the selected node.
     */
    var depth = null,
	depthLimit = null,
	selectedNodeId = null,

	setDepthLimit = function(val) {
	    if (val < 0) {
		throw new Error("Depth limit cannot be below 0.");
	    } else {
		depthLimit = val;
	    }
	};

    return {
	getDepth: function() {
	    if (depth === null) {
		if (depthLimit === null) {
		    return null;
		} else {
		    return depthLimit;
		}
	    } else if (depthLimit === null) {
		// This case should never happen, but is included for completeness.
		return null;
	    } else {
		return Math.min(depth, depthLimit);
	    }
	},

	hasDepth: function() {
	    return depth !== null;
	},
	
	setDepth: function(val) {
	    if (selectedNodeId === null) {
		throw new Error("Cannot set depth without first selecting a node.");
	    }

	    if (val < 0) {
		depth = 0;
	    } else if (val >= depthLimit) {
		/*
		 If we're at or above the maximum zoom out, consider that the user intends for us to stay as zoomed out as possible.
		 */
		depth = null;
		
	    } else {
		depth = val;
	    }
	},

	getDepthLimit: function() {
	    return depthLimit;
	},

	getSelectedNodeId: function() {
	    return selectedNodeId;
	},

	hasSelectedNodeId: function() {
	    return selectedNodeId !== null;
	},

	setSelectedNodeIdAndDepthLimit: function(newNodeId, newDepthLimit) {
	    selectedNodeId = newNodeId;
	    setDepthLimit(newDepthLimit);
	},

	setDepthLimit: setDepthLimit,

	clear: function() {
	    depth = null;
	    depthLimit = null;
	    selectedNodeId = null;
	}
    };
};
