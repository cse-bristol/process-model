"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Collapses and expands nodes en masse.

 If no nodes are currently collapsed, collapses the root nodes.
 Otherwise, expands all the nodes which are currently collapsed, and collapses their children instead.

 This gives the appearance of progressively unfolding the graph, until everything is expanded. At that point, the next call will collapse it back down again.
 */
module.exports = function(makeButton, getNodeCollection, getLayoutState, update) {
    var action = function() {
	var layout = getLayoutState(),
	    maxDepth = getNodeCollection().depthLookup.getMaxDepth();

	if (maxDepth === 1) {
	    layout.setDepth(null);
	    
	} else if (layout.depth() === null) {
	    layout.setDepth(1);
	    
	} else {
	    var newDepth = (layout.depth() + 1) % maxDepth;

	    layout.setDepth(
		newDepth || null
	    );
	}
	update();
    };
    
    return [
	makeButton(
	    "Collapse",
	    action,
	    {
		extraDisplayCondition: function() {
		    var layout = getLayoutState();
		    return !layout || layout.depth() === null && getNodeCollection().depthLookup.getMaxDepth() > 1;
		}
	    }
	),
	makeButton(
	    "Expand",
	    action,
	    {
		extraDisplayCondition: function() {
		    var layout = getLayoutState();
		    return layout && layout.depth() !== null;
		}
	    }
	)
    ];
};
