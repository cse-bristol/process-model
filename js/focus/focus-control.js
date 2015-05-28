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
module.exports = function(drawNodeHook) {
    var onSelectNode = callbacks();

    drawNodeHook(function(nodes, newNodes) {
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
    });
    
    return {
	onSelectNode: onSelectNode.add
    };
};
