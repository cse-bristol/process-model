"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Maintain a dictionary of parentNode ids by nodeId.
*/
module.exports = function(onNodeCreate, onNodeDelete, onEdgeCreate, onEdgeDelete) {
    var parents = d3.map();

    onNodeCreate.add(function(node) {
	parents.set(node.id, d3.set());
    });

    onNodeDelete.add(function(id) {
	parents.remove(id);
    });

    onEdgeCreate.add(function(e) {
	if (!parents.has(e.node().id)) {
	    parents.set(e.node().id, d3.set());
	}

	parents.get(e.node().id)
	    .add(e.parent().id);
    });

    onEdgeDelete.add(function(e) {
	if (parents.has(e.node().id)) {
	    parents.get(e.node().id)
		.remove(e.parent().id);
	}
    });

    return function(id) {
	return parents.get(id).values() || [];
    };
};
