"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Maintain a dictionary of parentNode ids by nodeId.
*/
module.exports = function(onNodeCreate, onNodeDelete, onEdgeCreate, onEdgeDelete) {
    var parents = d3.map(),
	withoutParents = d3.set();

    onNodeCreate(function(node) {
	parents.set(node.id, d3.set());
	withoutParents.add(node.id);
    });

    onNodeDelete(function(id) {
	parents.remove(id);
	withoutParents.remove(id);
    });

    onEdgeCreate(function(e) {
	if (!parents.has(e.node().id)) {
	    parents.set(e.node().id, d3.set());
	}

	parents.get(e.node().id)
	    .add(e.parent().id);

	withoutParents.remove(e.node().id);
    });

    onEdgeDelete(function(e) {
	if (parents.has(e.node().id)) {
	    parents.get(e.node().id)
		.remove(e.parent().id);
	}

	if (parents.get(e.node().id).empty()) {
	    withoutParents.add(e.node().id);
	}
    });

    return {
	parentsForNode: function(id) {
	    return parents.get(id).values() || [];
	},

	nodesWithoutParents: function() {
	    return withoutParents.values();
	}
    };
};
