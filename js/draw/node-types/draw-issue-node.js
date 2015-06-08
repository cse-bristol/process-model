"use strict";

/*global module, require*/

var textToggleFactory = require("./text-toggle.js");

module.exports = function(drawJunctions, getNodeCollection, update) {
    var textToggle = textToggleFactory(
	getNodeCollection,
	update,
	"issue-settled-display", 
	function text(d) {
	    return d.settled ? "Settled" : "Open";
	}, 
	function colouring(d) {
	    return d.settled ? "green" : "red";
	},
	function toggle(node) {
	    node.settled(!node.settled());
	}
    );
    
    return function(nodes, newNodes, margins, newMargins) {
	drawJunctions.simple(nodes, newNodes);

	textToggle(
	    margins,
	    newMargins
	);
    };
};
