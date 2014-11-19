"use strict";

/*global module, require*/

var _ = require("lodash"),
    helpers = require("../helpers.js"),
    noop = helpers.noop,
    jsonData = require("./json.js"),
    serialize = jsonData.serialize,
    serializeNode = jsonData.serializeNode,
    serializeEdge = jsonData.serializeEdge;

/*
 Watches the node graph and layout. Makes operations out of changes to them.

 Watched the context and alters the node graph and layout based on the operations it sees.
 */
module.exports = function(writeOp, onContextChanged, onOp, getNodeCollection, getLayout, onNodeCollectionChanged, update) {
    var listening = true,
	submitOp = function(op) {
	    if (listening) {
		writeOp(op);
	    }
	};

    var updateProperty = function(o, p, op) {
	if (o[p]) {
	    var prop = o[p];

	    if (op.od) {
		// Ignore: we have no concept of unsetting properties in our model.
	    }
	    
	    if (op.oi) {
		prop.call(o, op.oi);
		update();
	    }
	} else {
	    throw new Error("Unknown property " + p + " on " + o);
	}
    };

    var updateLayout = function(layout, path, op) {
	if (path.length === 0) {
	    // Noop: the whole layout is getting replaced, not our business.
	    
	} else if (path.length === 1) {
	    updateProperty(layout, path[0], op);
	} else {
	    throw new Error("Unknown path for updating layout: " + path);
	}
    };

    var updateEdge = function(edge, path, op) {
	if (path.length === 0) {
	    throw new Error("Adding and removing edges should be handled before we get here.");
	} else if (path.length === 1) {
	    updateProperty(edge, path[0], op);
	} else {
	    throw new Error("Unknown path for updating an edge property: " + path);
	}
    };

    var updateEdges = function(nodeCollection, node, path, op) {
	if (path.length === 0) {
	    throw new Error("We don't provide a way to update all the edges on a node at once.");
	}

	var targetId = path[0],
	    match = _.find(node.edges(), function(edge) {
		return edge.node().id === targetId;
	    });

	if (path.length === 1) {
	    if (op.od && match) {
		match.disconnect();
		update();
	    }

	    if (op.oi) {
		if (match) {
		    jsonData.deserializeEdgeDetails(op.oi, match);
		} else {
		    jsonData.deserializeEdge(op.oi, node, targetId, nodeCollection);
		}
		update();
	    }
	    
	} else {
	    if (match) {
		updateEdge(match, path.slice(1), op);
	    } else {
		throw new Error("Attempted to update an edge which didn't exist between " + node.id + " and " + targetId);
	    }
	}
    };

    var updateNode = function(nodeCollection, node, path, op) {
	if (path.length === 0) {
	    throw new Error("Adding and removing nodes should be handled before we get here.");
	} else if (path.length === 1) {
	    updateProperty(node, path[0], op);
	} else if (path[0] === "edges") {
	    updateEdges(nodeCollection, node, path.slice(1), op);
	    
	} else {
	    throw new Error("Unknown path for updating a node: " + path);
	}
    };

    var updateNodes = function(nodeCollection, path, op) {
	if (path.length === 0) {
	    // Noop: we're replacing all the nodes, not our business.
	    
	} else if (path.length === 1) {
	    if (op.od) {
		// Ignore: the node will be removed automatically when the edges connecting to it go.
	    }
	    if (op.oi) {
		jsonData.deserializeNode(path[0], op.oi, nodeCollection);
		update();
	    }
	} else {
	    if (!nodeCollection.has(path[0])) {
		throw new Error("Unknown node " + path[0]);
	    }
	    updateNode(nodeCollection, nodeCollection.get(path[0]), path.slice(1), op);
	}
    };
    
    onOp(function(op) {
	listening = false;

	try {
	    switch(op.p[0]) {
	    case "nodes":
		updateNodes(getNodeCollection(), op.p.slice(1), op);
		break;
	    case "layout":
		updateLayout(getLayout(), op.p.slice(1), op);
		break;
	    default:
		// We don't know how to handle this event.
		break;
	    }
	} finally {
	    listening = true;
	}
    });    
    
    var hook = function(o, makePath, serialize, prop) {
	if (o[prop]) {
	    var wrapped = o[prop];
	    o[prop] = function() {
		var args = arguments;

		if (arguments.length) {
		    var oldVal = wrapped.apply(o),
			returnVal = wrapped.apply(o, arguments),
			newVal = wrapped.apply(o);

		    submitOp({
			p: makePath().concat([prop]),
			od: oldVal,
			oi: newVal
		    });

		    return returnVal;
		} else {
		    return wrapped();
		}
	    };
	}
    };

    var hookNode = function(node) {
	/*
	 I've chosen not to hook up the chooseType function in here. This means that a node changes identity when it changes type, which is probably ok since it has no interesting properties on it.
	 */   
	var makePath = function() {
	    return ["nodes", node.id];
	};

	["name", "localEvidence", "description", "dependence", "settled", "support"]
	    .forEach(function(p) {
		hook(node, makePath, serializeNode, p);
	    });
    };

    var hookEdge = function(edge) {
	var makePath = function() {
	    return ["nodes", edge.parent().id, "edges", edge.node().id];
	};

	["necessity", "sufficiency"]
	    .forEach(function(p) {
		hook(edge, makePath, serializeEdge, p);
	    });
    };

    onNodeCollectionChanged(function() {
	var coll = getNodeCollection(),
	    layout = getLayout();

	coll.all().forEach(function(n) {
	    hookNode(n);
	    n.edges().forEach(function(e) {
		hookEdge(e);
	    });
	});
	
	coll.onNodeCreate(function(node) {
	    hookNode(node);
	    submitOp({
		p: ["nodes", node.id],
		oi: serializeNode(node)
	    });
	});

	coll.onNodeDelete(function(node) {
	    submitOp({
		p: ["nodes", node.id],
		od: node
	    });
	});

	coll.onEdgeCreate(function(edge) {
	    submitOp({
		p: ["nodes", edge.parent().id, "edges", edge.node().id],
		oi: serializeEdge(edge)
	    });
	    hookEdge(edge);
	});

	coll.onEdgeDelete(function(edge) {
	    submitOp({
		p: ["nodes", edge.parent().id, "edges", edge.node().id],
		od: serializeEdge(edge)
	    });
	});
    });
};
