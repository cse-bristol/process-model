"use strict";

/*global require, module*/

var d3 = require("d3"),
    nodeCollectionFactory = require("../state/graph/node-collection.js"),
    layoutFactory = require("../state/layout-state.js");

var serializeD3Map = function(d3Map) {
    var result = {};

    d3Map.forEach(function(key, value) {
	result[key] = value;
    });

    return result;
};

var serializeD3Set = function(d3Set) {
    var result = {};

    d3Set.values().forEach(function(key) {
	result[key] = true;
    });
    
    return result;
};

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
	collapsed: serializeD3Set(layout.collapsed()),
	positions: serializeD3Map(layout.position()),
	sizes: serializeD3Map(layout.size()),
	orientation: layout.getOrientation()
    };
};

var deserializeEdgeDetails = function(serialized, edge) {
    if (edge.necessity) {
	edge.necessity(serialized.necessity);
    }
    if (edge.sufficiency) {
	edge.sufficiency(serialized.sufficiency);
    }
};

var deserializeEdge = function(serialized, fromNode, toNodeId, nodeCollection) {
    var target = nodeCollection.get(toNodeId);
    
    if (!target) {
	throw new Error("Missing node with id " + toNodeId);
    }
    var edge = fromNode.edgeTo(target);

    deserializeEdgeDetails(serialized, edge);
};

var deserializeNodeDetails = function(serialized, deserialized, nodeCollection) {
    var edgeIds = Object.keys(serialized.edges);
    
    edgeIds.forEach(function(edgeId) {
	var e = serialized.edges[edgeId];

	deserializeEdge(e, deserialized, edgeId, nodeCollection);
    });

    if (serialized.name) {
	deserialized.setName(serialized.name);
    }

    if (serialized.dependence) {
	deserialized.dependence(serialized.dependence);
    }
    
    if (serialized.evidence) {
	deserialized.localEvidence(serialized.evidence);
    }

    if (serialized.description) {
	deserialized.setDescription(serialized.description);
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
    if (o.layout) {

	if (o.layout.collapsed) {
	    Object.keys(o.layout.collapsed).forEach(function(id) {
		if (o.layout.collapsed[id]) {
		    layout.setCollapsed(id, true);
		} else {
		    layout.setCollapsed(id, false);
		}
	    });
	}

	if (o.layout.positions) {
	    Object.keys(o.layout.positions).forEach(function(id) {
		layout.setPosition(id, o.layout.positions[id]);
	    });
	}

	if (o.layout.sizes) {
	    Object.keys(o.layout.sizes).forEach(function(id) {
		layout.setSize(id, o.layout.sizes[id]);
	    });
	}

	if (o.layout.orientation) {
	    layout.setOrientation(o.layout.orientation);
	}
    }

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
};

/*
 Converts model and layout to and from simpler Javascript objects for data transfer.

 Doesn't actually do any JSON parsing (that's handled for us in Sharejs).

 Format documented in README.org
 */
module.exports = {
    serializeNode: serializeNode,
    serializeEdge: serializeEdge,
    serialize: function(model) {
	return {
	    layout: serializeLayout(model.layout),
	    nodes: serializeNodes(model.nodes.all())
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
    },

    /*
     Does not create the edge, just gets its properties out.
     */
    deserializeEdgeDetails: deserializeEdgeDetails,

    /*
     Creates the edge and sets its properties.
     */
    deserializeEdge: deserializeEdge,

    deserializeNode: function(id, serialized, nodeCollection) {
	var deserialized = nodeCollection.getOrCreateNode(serialized.type, id);
	deserializeNodeDetails(serialized, deserialized, nodeCollection);
    }
};


