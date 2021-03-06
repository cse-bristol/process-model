"use strict";

/*global module, require*/

var _ = require("lodash"),
    d3 = require("d3"),
    helpers = require("../../helpers.js"),
    callbacks = helpers.callbackHandler,
    guid = helpers.guid,
    makeNode = require("./abstract-node.js"),
    parentLookupFactory = require("./parent-lookup.js"),
    depthLookupFactory = require("./depth-lookup.js");

/*
 A graph of process nodes. Nodes in the graph are not required to be connected.
 */
module.exports = function() {
    var nodesById = d3.map(),
    
	onNodeCreate = callbacks(),
	onNodeDelete = callbacks(),
	onNodeChooseType = callbacks(),
	onEdgeCreate = callbacks(),
	onEdgeDelete = callbacks(),
	onNavigate = callbacks(),

	ids = function() {
	    return d3.set(
		nodesById.keys()
	    );
	},

	parentLookup = parentLookupFactory(onNodeCreate.add, onNodeDelete.add, onEdgeCreate.add, onEdgeDelete.add),
	depthLookup = depthLookupFactory(ids, parentLookup.parentsForNode, onNodeCreate.add, onNodeDelete.add, onEdgeCreate.add, onEdgeDelete.add);
	
    var edgesToNode = function(nodeId) {
	return parentLookup.parentsForNode(nodeId).map(function(parentId) {
	    return nodesById.get(parentId)
		.edgeTo(nodesById.get(nodeId));
	});
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
		node = makeNode(type, id, onEdgeCreate, onEdgeDelete, onNavigate);

	    }
	} else {
	    node = makeNode(type, guid(), onEdgeCreate, onEdgeDelete, onNavigate);
	}

	nodesById.set(node.id, node);
	onNodeCreate(node);	
	
	return node;
    };

    var m = {
	all: _.bind(nodesById.values, nodesById),
	ids: ids,
	has: _.bind(nodesById.has, nodesById),
	get: _.bind(nodesById.get, nodesById),

	edgesToNode: function(node) {
	    if (!nodesById.has(node.id)) {
		throw new Error("Node not present in this node collection " + node);
	    }

	    return edgesToNode(node.id);
	},

	nodesWithoutParents: function() {
	    return parentLookup.nodesWithoutParents();
	},

	depthLookup: depthLookup,
	
	getOrCreateNode: getOrCreateNode,

	deleteNode: function(id) {
	    edgesToNode(id).forEach(function(e) {
		e.disconnect();
	    });

	    nodesById.get(id)
		.edges()
	    // Deleting edges from the collection while iterating through it causes problems. Take a copy of it to avoid this.
		.slice(0)
		.forEach(function(e) {
		    e.disconnect();
		});
	    
	    nodesById.remove(id);

	    onNodeDelete(id);
	},

	chooseNodeType: function(node, type) {
	    if (!nodesById.has(node.id)) {
		throw new Error("Node does not belong to this collection " + node.name());
	    }

	    if (node.type !== "undecided") {
		throw new Error("Attempted to choose the type of node " + node.name() + " but it already has type " + node.type);
	    }

	    var replacement = getOrCreateNode(type);
	    replacement.setName(node.name());

	    onNodeChooseType(node, replacement);
	    
	    edgesToNode(node.id).forEach(function(e) {
		e.parent().edgeTo(replacement);
		e.disconnect();
	    });

	    m.deleteNode(node.id);

	    return replacement;
	},

	/*
	 Returns a set containing the id passed in and the ids of all its descendents.

	 If the id is not contained in this node collection, returns an empty set.
	 */
	descendentIds: function(id) {
	    var findChildIdsAccum = function(id, accum) {
		if (!nodesById.has(id)) {
		    return;
		}
		
		var current = nodesById.get(id);

		accum.set(id, current);
		
		current.edges().forEach(function(e) {
		    if (!accum.has(e.node().id)) {
			findChildIdsAccum(
			    e.node().id,
			    accum
			);
		    }
		});
	    };

	    var accum = d3.map();
	    
	    findChildIdsAccum(id, accum);
	    
	    return d3.set(accum.keys());
	},

	/*
	 Adds all the nodes from another node collection to this one, retaining the edges between them.
	 */
	merge: function(toMerge) {
	    toMerge.all()
		.forEach(function(node) {
		    nodesById.set(node.id, node);
		    onNodeCreate(node);
		});
	},

	onNodeCreate: onNodeCreate.add,
	onNodeDelete: onNodeDelete.add,
	onNodeChooseType: onNodeChooseType.add,
	onEdgeCreate: onEdgeCreate.add,
	onEdgeDelete: onEdgeDelete.add,
	onNavigate: onNavigate.add
    };

    return m;
};
