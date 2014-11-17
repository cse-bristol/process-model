"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    guid = helpers.guid,
    makeNodes = require("./abstract-node.js");

/*
 A graph of process nodes starting from a particular root node.
 */
module.exports = function() {
    var nodesById = d3.map(),
	// Unconnected nodes will not be culled from a collection until this is set to true.
	built = false,
	onNodeCreate = callbacks(),
	onNodeDelete = callbacks(),
	onEdgeCreate = callbacks(),
	onEdgeDelete = callbacks(),
	onNavigate = callbacks(),
	root;

    var removeUnreachable = function() {
	var findUnreachableAccum = function(node, unreached) {
	    unreached.remove(node.id);
	    node.edges().forEach(function(e){
		findUnreachableAccum(e.node(), unreached);
	    });
	};

	var unreached = d3.set(nodesById.keys());
	findUnreachableAccum(root, unreached);
	
	unreached.forEach(function(n) {
	    onNodeDelete(n);
	    nodesById.get(n).edges().forEach(function(e) {
		onEdgeDelete(e);
	    });
	    nodesById.remove(n);
	});
    };

    var edgesToNode = function(node) {
	var edges = [],
	    stack = [root],
	    seen = d3.set();

	while (stack.length > 0) {
	    var current = stack.pop();
	    if (!seen.has(current.name())) {
		seen.add(current.name());
		current.edges().forEach(function(e){
		    if (e.node() === node) {
			edges.push(e);
		    } else {
			stack.push(e.node());
		    }
		});
	    }
	}
	return edges;
    };

    var getOrCreateNode = function(type, id) {
	var node;
	
	if (id) {
	    if (nodesById.has(id)) {
		node = nodesById.get(id);
		if (node.type !== type) {
		    throw new Error("Node with id " + id + " already exists with a different type.");
		} else {
		    return node;
		}
		
	    } else {
		node = makeNodes.create(type, id, onEdgeCreate, onEdgeDelete, onNavigate);

	    }
	} else {
	    node = makeNodes.create(type, guid(), onEdgeCreate, onEdgeDelete, onNavigate);
	}
	onNodeCreate(node);
	nodesById.set(node.id, node);
	return node;
    };

    var m = {
	all: nodesById.values,
	has: nodesById.has,
	get: nodesById.get,
	clean: removeUnreachable,
	root: function(newRoot) {
	    if (newRoot) {
		if (built) {
		    throw new Error("Cannot change the root node once the collection has been built.");
		}
		
		return m;
	    }
	    
	    return root;
	},
	build: function() {
	    built = true;
	    removeUnreachable();
	    if (!root) {
		throw new Error("Tried to build a collection which has no root node.");
	    }
	},
	
	edgesToNode: function(node) {
	    if (!nodesById.has(node.id)) {
		throw new Error("Node not present in this node collection " + node);
	    }

	    return edgesToNode(node);
	},
	
	getOrCreateNode: getOrCreateNode,

	chooseNodeType: function(node, type) {
	    if (!nodesById.has(node.id)) {
		throw new Error("Node does not belong to this collection " + node.name());
	    }

	    if (node.type !== "undecided") {
		throw new Error("Attempted to choose the type of ndoe " + node.name() + " but it already has type " + node.type);
	    }

	    var replacement = getOrCreateNode(type);
	    replacement.name(node.name());
	    
	    node.incomingEdges().forEach(function(e) {
		e.parent().edgeTo(replacement);
		e.disconnect();
	    });

	    return replacement;
	},

	onNodeCreate: onNodeCreate.add,
	onNodeDelete: onNodeDelete.add,
	onEdgeCreate: onEdgeCreate.add,
	onEdgeDelete: onEdgeDelete.add,
	onNavigate: onNavigate.add
    };

    return m;
};
