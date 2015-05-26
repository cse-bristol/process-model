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
	onChangeDepth = callbacks(),

	focusTools = container.append("div")
	    .classed(focusToolsClass, true),

	increaseDepthTool = focusTools.append("div")
	    .text("+")
	    .on("click", function() {
		onChangeDepth(-1);
	    }),

	decreaseDepthTool = focusTools.append("div")
	    .text("-")
	    .on("click", function() {
		onChangeDepth(1);
	    }),

	disableDepthTools = function(disable) {
	    increaseDepthTool.classed(disableClass, disable);
	    decreaseDepthTool.classed(disableClass, disable);
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
	    .attr("x", 3)
	    .attr("y", 12);
    });
    
    return {
	onSelectNode: onSelectNode.add,
	onChangeDepth: onChangeDepth.add,
	disableDepthTools: function() {
	    disableDepthTools(true);
	},

	enableDepthTools: function() {
	    disableDepthTools(false);
	}
    };
};
