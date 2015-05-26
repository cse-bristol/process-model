"use strict";

/*global module, require*/

module.exports = function() {
    /*
     Depth is how many levels of edges we will follow when accumulating children of the selected node.
     */
    var depth = null,
	selectedNodeId = null;

    return {
	getDepth: function() {
	    return depth;
	},

	hasDepth: function() {
	    return depth !== null;
	},
	
	setDepth: function(val) {
	    if (val < 0) {
		depth = 0;
	    } else {
		depth = val;
	    }
	},

	/*
	 If depth has not been set, set it as high as it will go.

	 If depth has been set, but is higher than allowed, set it to the maximum.

	 Otherwise, leave it be.
	 */
	limitDepth: function(maximumForNode) {
	    if (maximumForNode < 0) {
		throw new Error("Maximum depth must always be at least 0.");
	    }
	    
	    if (depth !== null && depth > maximumForNode) {
		depth = maximumForNode;
	    }
	},

	getSelectedNodeId: function() {
	    return selectedNodeId;
	},

	hasSelectedNodeId: function() {
	    return selectedNodeId !== null;
	},

	setSelectedNodeId: function(val) {
	    selectedNodeId = val;
	},

	clear: function() {
	    depth = null;
	    selectedNodeId = null;
	}
    };
};
