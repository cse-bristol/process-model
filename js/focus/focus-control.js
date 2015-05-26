"use strict";

/*global module, require*/

var helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,

    focusToolsClass = "focus-tools",
    disableClass = "disabled",
    focusNodeToolClass = "focus-node-tool";

/*
 Container is the place where we will put our depth change controls.

 drawNodesHook is a function which is called each time we update nodes.
 */
module.exports = function(container, drawNodesHook) {
    var onSelectNode = callbacks(),
	onSetDepth = callbacks(),

	focusTools = container.append("div")
	    .classed(focusToolsClass, true),

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

	disableDepthTools = function(disable) {
	    increaseDepthTool.classed(disableClass, disable);
	    decreaseDepthTool.classed(disableClass, disable);
	    depthSlider.attr("disabled", disable ? true : null);
	};

    drawNodesHook(function(nodes, newNodes) {
	var focusG = newNodes
		.append("g")
		.classed(focusNodeToolClass, true)
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size[0] - 30) + "," + 0 + ")";
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
    });
    
    return {
	onSelectNode: onSelectNode.add,
	onSetDepth: onSetDepth.add,

	update: function(data) {
	    var selected = data.hasSelectedNodeId();
	    
	    disableDepthTools(!selected);

	    depthSlider.attr("max", data.getDepthLimit());
	    
	    if (data.hasDepth())  {
		depthSlider.node().value = data.getDepth();
	    } else {
		depthSlider.node().value = data.getDepthLimit();
	    }
	}
    };
};
