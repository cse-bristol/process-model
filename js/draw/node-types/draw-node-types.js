"use strict";

/*global module, require*/

var d3 = require("d3"),

    undecided = require("./draw-undecided-node.js"),
    process = require("./draw-process-node.js"),
    issue = require("./draw-issue-node.js"),
    option = require("./draw-option-node.js"),
    argument = require("./draw-argument-node.js"),

    junctionsFactory = require("./junctions/draw-junctions.js");

module.exports = function(container, redrawNode, transitions, viewport, getNodeCollection, getLayoutState, update) {
    var drawJunctions = junctionsFactory(container, transitions, redrawNode, getNodeCollection, getLayoutState, update),

	types = d3.map({
	    undecided: undecided(getNodeCollection, transitions, viewport, update),
	    process: process(drawJunctions, redrawNode, getNodeCollection, update),
	    issue: issue(drawJunctions, getNodeCollection, update),
	    option: option(drawJunctions),
	    argument: argument(getNodeCollection, update)
	}),

	filterByType = function(selection, type) {
	    return selection.filter(function(d, i) {
		return d.type === type;
	    });
	};

    return {
	types: types,
	draw: function(nodes, newNodes, margins, newMargins) {
	    
	    types.entries().forEach(function(e) {
		e.value(
		    filterByType(nodes, e.key),
		    filterByType(newNodes, e.key),
		    filterByType(margins, e.key),
		    filterByType(newMargins, e.key)		    
		);
	    });
	}
    };


};
