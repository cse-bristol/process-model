"use strict";

/*global module, require*/

var d3 = require("d3"),

    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,

    focusToolsClass = "focus-tools",
    disableClass = "disabled",
    focusNodeToolClass = "focus-node-tool",

    focusedNodeClass = "focused";

/*
 Container is the place where we will put our depth change controls.

 drawNodesHook is a function which is called each time we update nodes.
 */
module.exports = function(container, drawNodesHook, data) {
    var onSelectNode = callbacks(),
	onSetDepth = callbacks(),

	focusedNode,

	focusTools = container.append("div")
	    .classed(focusToolsClass, true)
	    .classed("no-select", true),

	increaseDepthTool = focusTools.append("div")
	    .text("+")
	    .on("click", function() {
		onSetDepth(depthSlider.node().value - 1);
	    }),

	depthSlider = focusTools.append("input")
	    .attr("type", "range")
	    .attr("min", 0)
	    .attr("max", 0)
	    .on("input", function() {
		onSetDepth(depthSlider.node().value);
	    }),

	decreaseDepthTool = focusTools.append("div")
	    .text("-")
	    .on("click", function() {
		onSetDepth(depthSlider.node().value + 1);
	    }),

	disableDepthTools = function(disable, data) {
	    increaseDepthTool.classed(disableClass, disable ? true : data.getDepth() === 0);
	    decreaseDepthTool.classed(disableClass, disable ? true : data.getDepth() === data.getDepthLimit());
	    depthSlider.attr("disabled", disable ? true : null);
	};

    drawNodesHook(function(nodes, newNodes) {
	var focusG = newNodes
		.append("g")
		.classed(focusNodeToolClass, true)
		.classed("no-select", true)
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size[0] - 30) + "," + 0 + ")";
		})
		.on("mousedown", function() {
		    /*
		     Prevent this event from causing a drag event.
		     */
		    d3.event.stopPropagation();
		})
		.on("click", function(d, i) {
		    onSelectNode(d.id);
		});

	focusG
	    .append("rect")
	    .attr("width", 15)
	    .attr("height", 15);

	focusG.append("text")
	    .text("F")
	    .attr("x", 4)
	    .attr("y", 12);

	nodes.classed(
	    focusedNodeClass,
	    function(d, i) {
		if (d.id === data.getSelectedNodeId()) {
		    focusedNode = this;
		    return true;
		    
		} else {
		    return null;
		}
	    }
	);
    });
    
    return {
	onSelectNode: onSelectNode.add,
	onSetDepth: onSetDepth.add,

	/*
	 When the user has manually panned or zoomed, we don't want to do a whole update loop to change this.
	 */
	clearFocus: function() {
	    if (focusedNode) {
		d3.select(focusedNode)
		    .classed(focusedNodeClass, false);
	    }
	},

	update: function() {
	    var selected = data.hasSelectedNodeId();
	    
	    disableDepthTools(!selected, data);

	    depthSlider.attr("max", data.getDepthLimit());
	    
	    depthSlider.node().value = data.getDepth();
	}
    };
};
