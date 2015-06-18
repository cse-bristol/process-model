"use strict";

/*global module, require*/

var textToggleFactory = require("./text-toggle.js");

module.exports = function(getNodeCollection, transitions, update) {
    var textToggle = textToggleFactory(
	getNodeCollection,
	transitions,
	update,
	"issue-settled-display", 
	function text(d) {
	    return d.support ? "Supports" : "Refutes";
	}, 
	function colouring(d) {
	    return d.support ? "yellow" : "cyan";
	},
	function toggle(node) {
	    node.support(!node.support());
	}	
    );
    
    return function(nodes, newNodes, margins, newMargins) {
	textToggle(
	    margins,
	    newMargins
	);
    };
};
