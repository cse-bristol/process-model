"use strict";

/*global module, require*/

var _ = require("lodash"),
    d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    guid = helpers.guid,
    makeNode = require("./abstract-node.js"),
    parentLookupFactory = require("./parent-lookup.js");

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

	parentLookup = parentLookupFactory(onNodeCreate, onNodeDelete, onEdgeCreate, onEdgeDelete);
	
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
	onNodeCreate(node);
	nodesById.set(node.id, node);
	
	return node;
    };

    var m = {
	all: _.bind(nodesById.values, nodesById),
	ids: function() {
	    return d3.set(
		nodesById.keys());
	},
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
	
	getOrCreateNode: getOrCreateNode,

	deleteNode: function(id) {
	    edgesToNode(id).forEach(function(e) {
		e.disconnect();
	    });
	    nodesById.get(id).edges().forEach(function(e) {
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
	    replacement.name(node.name());

	    onNodeChooseType(node, replacement);
	    
	    edgesToNode(node.id).forEach(function(e) {
		e.parent().edgeTo(replacement);
		e.disconnect();
	    });

	    m.deleteNode(node.id);

	    return replacement;
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
