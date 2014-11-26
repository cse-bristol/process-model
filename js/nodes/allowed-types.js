"use strict";

/*global module, require*/

var d3 = require("d3"),
    allTypes = d3.set(
	require("./process-node.js").keys()
    ),
    intersection = function(a, b) {
	return d3.set(a.values().filter(function(o) {
	    return b.has(o);
	}));
    };

/*
 Works out what types are valid for an undecided node to become.
 */
module.exports = function(node, nodeCollection) {
    if (node.type !== "undecided") {
	throw new Error("Only appropriate for undecided nodes.");
    }
    
    var allowed = allTypes;

    nodeCollection.edgesToNode(node)
	.forEach(function(e) {
	    allowed = intersection(allowed, e.parent().allowedChildren);
	});

    return allowed;
};
