"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Given a nodes collection and a function which identifies whether a node is collapsed or not by id,

 Returns a list of map of id -> node for nodes which are not hidden inside a collapsed node.
 */
module.exports = function(nodesCollection, isCollapsed) {
    var startNodes = nodesCollection.nodesWithoutParents()
	    .map(function(id) {
		return nodesCollection.get(id);
	    }),
	
	stack = startNodes,
	found = d3.map(),
	foundFromCollapsed = d3.set();
    
    while(stack.length > 0) {
	var node = stack.pop(),
	    id = node.id,
	    collapsed = isCollapsed(id);

	found.set(id, node);

	node.edges().forEach(function(e){
	    /* 
	     If we reach a node from any uncollapsed node, or from two or more collapsed nodes, we'll keep it.
	     */
	    if (found.has(e.node().id)) {
		// NOOP

	    } else if (!collapsed || foundFromCollapsed.has(e.node().id)) {
		stack.push(e.node());
		foundFromCollapsed.remove(e.node().id);

	    } else {
		foundFromCollapsed.add(e.node().id);
	    }
	});
    }

    return found;
};

