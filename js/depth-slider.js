"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("./helpers.js"),
    noop = helpers.noop,

    depthSlider = "depth-slider";

/*
 Collapses and expands nodes en masse.

 If no nodes are currently collapsed, collapses the root nodes.
 Otherwise, expands all the nodes which are currently collapsed, and collapses their children instead.

 This gives the appearance of progressively unfolding the graph, until everything is expanded. At that point, the next call will collapse it back down again.
 */
module.exports = function(toolbar, getNodeCollection, getLayoutState, update) {
    var button = toolbar.append("div")
	    .attr("id", "levels-button")
	    .text("Levels")
	    .on("click", function() {
		var layout = getLayoutState(),
		    currentDepth = layout.depth();

		if (currentDepth === null) {
		    layout.setDepth(slider.node().value);
		    
		} else {
		    layout.setDepth(null);
		}

		update();
	    }),

	sliderWrapper = toolbar.append("div")
	    .classed("depth-slider-wrapper", true),

	sliderLabel = sliderWrapper.append("label")
	    .attr("for", depthSlider)
	    .text("Levels"),

	slider = sliderWrapper.append("input")
	    .attr("type", "range")
	    .attr("id", depthSlider)
    	    .classed(depthSlider, true)
	    .attr("min", 1)
	    .on("input", function() {
		var layout = getLayoutState(),
		    nodeCollection = getNodeCollection();
		
		if (!layout || !nodeCollection) {
		    return;
		}
		
		var depthLookup = nodeCollection.depthLookup,
		    controlDepth = Math.min(
			slider.node().value,
			depthLookup.getMaxDepth()
		    );

		if (controlDepth === layout.depth()) {
		    return;
		} else {
		    layout.setDepth(controlDepth);
		    update();
		}
	    }),

	redraw = function() {
	    var nodes = getNodeCollection(),
		layout = getLayoutState();

	    if (!nodes || !layout) {
		return;
	    }
	    
	    var max = nodes.depthLookup.getMaxDepth(),
		enabled = layout.depth() !== null;

	    slider.attr("max", max);
	    
	    /*
	     We represent completed expanded in the layout state as null, but represent it to the user as the maximum value.
	     */
	    slider.node().value = layout.depth() || max;

	    button.classed("enabled", enabled);
	    sliderWrapper.classed("enabled", enabled);
	};

    redraw();

    return {
	update: redraw
    };
};
