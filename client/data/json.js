"use strict";

/*global require, module*/

var d3 = require("d3"),
    nodeCollectionFactory = require("../nodes/node-collection.js"),
    layoutFactory = require("../layout.js");

var serializeEdge = function(edge) {
    var e = {
    };
    
    if (edge.necessity) {
	e.necessity = edge.necessity();
    }

    if (edge.sufficiency) {
	e.sufficiency = edge.sufficiency();
    }

    return e;
};

var serializeEdges = function(edges) {
    var r = {};
    
    edges.forEach(function(e) {
	r[e.node().id] = serializeEdge(e);
    });
    
    return r;
};

var serializeNode = function(node) {
    var serialized = {
	name: node.name(),
	description: node.description(),
	type: node.type,
	edges: serializeEdges(node.edges())
    };

    if (node.isLeaf()) {
	if (node.localEvidence) {
	    serialized.evidence = node.localEvidence();		
	}
    } else {
	if (node.dependence) {
	    serialized.dependence = node.dependence();
	}
    }

    if (node.settled) {
	serialized.settled = node.settled();
    }

    if (node.support) {
	serialized.support = node.support();
    }

    return serialized;
};

var serializeNodes = function(nodes) {
    var r = {};

    nodes.forEach(function(n) {
	r[n.id] = serializeNode(n);
    });

    return r;
};

var serializeLayout = function(layout) {
    return {
	collapsed: layout.collapsed().values(),
	positions: layout.position().entries(),
	sizes: layout.size().entries()
    };
};

var deserializeNodeDetails = function(serialized, deserialized, nodeCollection) {
    var edgeIds = Object.keys(serialized.edges);
    
    edgeIds.forEach(function(edgeId) {
	var e = serialized.edges[edgeId];

	var target = nodeCollection.get(edgeId);
	
	if (!target) {
	    throw new Error("Missing node with id " + edgeId);
	}
	var edge = deserialized.edgeTo(target);

	if (edge.necessity) {
	    edge.necessity(e.necessity);
	}
	if (edge.sufficiency) {
	    edge.sufficiency(e.sufficiency);
	}
    });

    if (serialized.dependence) {
	deserialized.dependence(serialized.dependence);
    }
    
    if (serialized.localEvidence) {
	deserialized.localEvidence(serialized.evidence);
    }

    if (serialized.description) {
	deserialized.description(serialized.description);
    }
    
    if (deserialized.settled) {
	deserialized.settled(serialized.settled);
    }

    if (deserialized.support) {
	deserialized.support(serialized.support);
    }

    return deserialized;
};


var deserializeLayoutAndData = function(o, nodeCollection, layout) {
    o.layout.collapsed.forEach(function(c){
	layout.collapsed(c);
    });
    o.layout.positions.forEach(function(e){
	layout.position(e.key, e.value);
    });
    o.layout.sizes.forEach(function(e) {
	layout.size(e.key, e.value);
    });

    /*
     Create nodes with just the type and id first.
     */
    Object.keys(o.nodes).forEach(function(id) {
	var serialized = o.nodes[id],
	    node = nodeCollection.getOrCreateNode(serialized.type, id);
    });

    Object.keys(o.nodes).forEach(function(id) {
	deserializeNodeDetails(o.nodes[id], nodeCollection.get(id), nodeCollection);
    });
    
    nodeCollection.root(nodeCollection.get(o.root));
};

/*
 Converts model and layout to and from simpler Javascript objects for data transfer.

 Doesn't actually do any JSON parsing (that's handled for us in Sharejs).

 Format documented in README.org
 */
module.exports = {
    serializeNode: serializeNode,
    serializeEdge: serializeEdge,
    serialize: function(nodeCollection, layout) {
	return {
		layout: serializeLayout(layout),
		root: nodeCollection.root().id,
		nodes: serializeNodes(nodeCollection.all())
	    };
    },

    deserialize: function(json) {
	var nodeCollection = nodeCollectionFactory(),
	    layout = layoutFactory(nodeCollection);
	deserializeLayoutAndData(json, nodeCollection, layout);

	return {
	    nodes: nodeCollection,
	    layout: layout
	};
    }
};


