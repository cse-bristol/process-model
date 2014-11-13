"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(nodes) {
    var allowedTypes = d3.map(),
	allTypes = d3.set(nodes.types());
    var intersection = function(a, b) {
	return d3.set(a.values().filter(function(o) {
	    return b.has(o);
	}));
    };
    
    return {
	allowedTypesForNode: function(name) {
	    if (!allowedTypes.has(name)) {
		if (nodes.get(name).incomingEdges().length === 0) {
		    return allTypes;
		} else {
		    throw new Error("Don't know about node " + name);
		}
	    }
	    
	    return allowedTypes.get(name);
	},
	update: function() {
	    var update = function(node) {
		node.edges().forEach(function(e) {
		    var name = e.node().name();

		    if (allowedTypes.has(name)) {
			allowedTypes.set(name, 
					 intersection(
					     allowedTypes.get(name),
					     node.allowedChildren
					 ));
			
		    } else {
			allowedTypes.set(name, node.allowedChildren);
		    }
		    update(e.node());
		});
	    };

	    allowedTypes = d3.map();

	    update(nodes.root());
	}
    };
};
