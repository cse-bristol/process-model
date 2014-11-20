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
module.exports = function(writeOp, onOp, getNodeCollection, getLayout, onNodeCollectionChanged, update) {
    var listening = true,
	submitOp = function(op) {
	    if (listening) {
		writeOp(op);
	    }
	};

    var updateProperty = function(o, p, op) {
	if (o[p]) {
	    var prop = o[p];

	    if (op.od !== undefined) {
		// Ignore: we have no concept of unsetting properties in our model.
	    }
	    
	    if (op.oi !== undefined) {
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
	    
	} else {
	    switch(path[0]) {
	    case "collapsed":
		if (op.od !== undefined) {
		    layout.expand(path[1]);
		}
		if (op.oi !== undefined) {
		    // If the value for our id true or false?
		    if (op.oi) {
			layout.collapsed(path[1]);
		    } else {
			/*
			 We shouldn't ever get here, because we remove an id from the map rather than settings its value to false.
			 However, I've kept it for completeness.
			 */
			layout.expand(path[1]);
		    }
		}
		break;
	    case "sizes":
		if (op.od !== undefined) {
		    layout.removeSize(path[1], op.od);
		}
		if (op.oi !== undefined) {
		    layout.size(path[1], op.oi);
		}
		
		break;
	    case "positions":
		if (op.od !== undefined) {
		    layout.removePosition(path[1], op.od);
		}

		if (op.oi !== undefined) {
		    layout.position(path[1], op.oi);
		}
		
		break;
	    default:
		throw new Error("Unknown layout property " + path[0]);
	    }
	    update();
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
    
    var hook = function(o, makePath, prop) {
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
		hook(node, makePath, p);
	    });
    };

    var hookEdge = function(edge) {
	var makePath = function() {
	    return ["nodes", edge.parent().id, "edges", edge.node().id];
	};

	["necessity", "sufficiency"]
	    .forEach(function(p) {
		hook(edge, makePath, p);
	    });
    };

    var hookLayout = function(layout) {
	var makePath = function() {
	    return ["layout"];
	};

	layout.onSetSize(function(id, size) {
	    submitOp({
		p: ["layout", "sizes", id],
		oi: size
	    });
	});

	layout.onRemoveSize(function(id, oldValue) {
	    submitOp({
		p: ["layout", "sizes", id],
		od: oldValue
	    });
	});

	layout.onSetPosition(function(id, position) {
	    submitOp({
		p: ["layout", "positions", id],
		oi: position
	    });
	});

	layout.onRemovePosition(function(id, oldValue) {
	    submitOp({
		p: ["layout", "positions", id],
		od: oldValue
	    });
	});

	layout.onCollapse(function(id) {
	    /*
	     We don't care about order, but we do care about uniqueness.
	     JSON has no concept of a set, but a map of id -> true will do what we need.
	     */
	    submitOp({
		p: ["layout", "collapsed", id],
		oi: true
	    });
	});
	
	layout.onExpand(function(id) {
	    submitOp({
		p: ["layout", "collapsed", id],
		od: true
	    });
	});
    };

    onNodeCollectionChanged(function() {
	var coll = getNodeCollection(),
	    layout = getLayout();

	hookLayout(layout);

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
