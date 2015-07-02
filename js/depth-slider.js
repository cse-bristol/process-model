"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("./helpers.js"),
    noop = helpers.noop;

/*
 Collapses and expands nodes en masse.

 If no nodes are currently collapsed, collapses the root nodes.
 Otherwise, expands all the nodes which are currently collapsed, and collapses their children instead.

 This gives the appearance of progressively unfolding the graph, until everything is expanded. At that point, the next call will collapse it back down again.
 */
module.exports = function(makeButton, getNodeCollection, getLayoutState, update) {
    var input = null;

    return {
	button: makeButton(
	    "Levels",
	    noop,
	    {
		confirm: false,
		hooks: function(button) {
		    button.style("pointer-events", "none");

		    input = button.append("input")
			.classed("depth-slider", true)
		    	.attr("type", "range")
		    	.attr("min", 1)
		    	.on("input", function(d, i) {
			    var layout = getLayoutState(),
				nodeCollection = getNodeCollection();
			    
			    if (!layout || !nodeCollection) {
				return;
			    }
			    
			    var depthLookup = nodeCollection.depthLookup,
				controlDepth = input.node().value;

			    if (controlDepth >= depthLookup.getMaxDepth()) {
				controlDepth = null;
			    }
			    
			    if (controlDepth === layout.depth()) {
				return;
			    } else {
				layout.setDepth(controlDepth);
				update();
			    }
			});
		}
	    }
	),
	update: function() {
	    var max = getNodeCollection().depthLookup.getMaxDepth();

	    input.attr("max", max);
	    
	    /*
	     We represent completed expanded in the layout state as null, but represent it to the user as the maximum value.
	     */
	    input.node().value = getLayoutState().depth() || max;
	}
    };
};
