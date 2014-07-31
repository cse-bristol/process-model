"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.TrackAllowedTypes = function(nodes) {
    var allowedTypes = d3.map();
    var intersection = function(a, b) {
	return a.values().filter(function(o) {
	    return b.has(o);
	});
    };
    
    return {
	allowedTypesForNode: function(name) {
	    if (!allowedTypes.has(name)) {
		throw new Error("Don't know about node " + name);
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
	    allowedTypes.set(nodes.root().name(), nodes.root().type);

	    update(nodes.root());
	}
    };
};
