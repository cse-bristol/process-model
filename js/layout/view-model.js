"use strict";

/*global module, require*/

var nodeSidePadding = 10;

/*
 Immutable objects representing the display properties of our model.
 */
module.exports = {
    edge: function(edge, path, collapsed) {
	var e =  {
	    viewId: Math.random(),
	    parentId: edge.parent().id,
	    childId: edge.node().id,
	    path: path,
	    canModify: !collapsed
	};
	
	if (!collapsed && edge.necessity) {
	    e.necessity = edge.necessity();
	    e.sufficiency = edge.sufficiency();
	}
	
	return e;
    },

    node: function(node, size, x, y, collapsed) {
	var n = {
	    viewId: Math.random(),
	    id: node.id,
	    type: node.type,
	    collapsed: collapsed,
	    name: node.name(),
	    description: node.description(),
	    isLeaf: node.isLeaf(),
	    size: size,
	    x: x,
	    y: y,
	    innerWidth: size[0] - (2 * nodeSidePadding),
	    center: [
		size[0] / 2,
		size[1] / 2
	    ],
	    sidePadding: nodeSidePadding
	};

	switch (node.type) {
	case "process":
	    n.evidence = node.p();
	    n.dependence = node.dependence();
	    
	    break;
	case "issue":
	    n.settled = node.settled();
	    
	    break;
	case "option":
	    break;
	case "argument":
	    n.support = node.support();
	    
	    break;
	case "undecided":
	    break;
	default:
	    throw new Error("Unknown type of node " + node.type);
	}
	
	return n;
    }
};
