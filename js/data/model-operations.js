"use strict";

/*global module, require*/

var _ = require("lodash"),
    helpers = require("../helpers.js"),
    noop = helpers.noop,
    jsonData = require("./json.js"),
    serialize = jsonData.serialize,
    serializeNode = jsonData.serializeNode,
    serializeEdge = jsonData.serializeEdge,
    /*
     Chosen by experimentation to be quite fast, but not so fast that scrolling the scroll wheel or clicking and dragging will trigger multiple events.
     */
    delay = 300;

/*
 Watches the node graph and layout. Makes operations out of changes to them.

 Watched the context and alters the node graph and layout based on the operations it sees.
 */
module.exports = function(writeOp, onOp, getNodeCollection, getLayout, setModel, onModelChanged, update) {
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
		    /*
		     We only ever store 'true' for collapsed nodes, so if we deleted a value, that node must be expanded.
		    */
		    layout.setCollapsed(path[1], false);
		}
		if (op.oi !== undefined) {
		    layout.setCollapsed(path[1], op.oi);

		}
		break;
	    case "sizes":
		if (op.od !== undefined) {
		    layout.setSize(path[1], null);
		}
		if (op.oi !== undefined) {
		    layout.setSize(path[1], op.oi);
		}
		
		break;
	    case "positions":
		if (op.od !== undefined) {
		    layout.setPosition(path[1], null);
		}

		if (op.oi !== undefined) {
		    layout.setPosition(path[1], op.oi);
		}
		
		break;
	    case "orientation":
		if (op.oi !== undefined) {
		    layout.setOrientation(op.oi);
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
	    if (op.p.length === 0) {
		if (op.oi) {
		    // Replace the whole model.
		    
		    setModel(
			jsonData.deserialize(op.oi)
		    );
		    
		} else {
		    // This document has been deleted. We have no representation of a deleted document, so we'll leave it be.
		}
		
	    } else {
		
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
	    }
	} finally {
	    listening = true;
	}
    });    
    
    var hook = function(o, path, prop) {
	if (o[prop]) {
	    path = path.concat([prop]);
	    var wrapped = o[prop],
		/*
		 If a property changes multiple time rapidly, we'd like to squash them all into one commit since it's probably just someone clicking and dragging or scrolling the scroll wheel.
		*/
		delayedSubmit = _.debounce(
		    function(newVal) {
			submitOp({
			    p: path,
			    oi: newVal
			});
		    },
		    delay
		);
	    
	    o[prop] = function() {
		var args = arguments;

		if (arguments.length) {
		    var oldVal = wrapped.apply(o),
			returnVal = wrapped.apply(o, arguments),
			newVal = wrapped.apply(o);

		    if (oldVal !== newVal) {
			delayedSubmit(newVal);
		    }

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
	["name", "localEvidence", "description", "dependence", "settled", "support"]
	    .forEach(function(p) {
		hook(node, ["nodes", node.id], p);
	    });
    };

    var hookEdge = function(edge) {
	["necessity", "sufficiency"]
	    .forEach(function(p) {
		hook(
		    edge,
		    ["nodes", edge.parent().id, "edges", edge.node().id],
		    p
		);
	    });
    };

    var hookLayout = function(layout) {
	var makePath = function() {
	    return ["layout"];
	};

	var delayedSubmitOp = _.debounce(submitOp, 300);
	
	layout.onSetSize(function(id, size) {
	    if (size) {
		delayedSubmitOp({
		    p: ["layout", "sizes", id],
		    oi: size
		});

	    } else {
		delayedSubmitOp({
		    p: ["layout", "sizes"],
		    od: id
		});
	    }
	});

	layout.onSetPosition(function(id, position) {
	    if (position) {
	    
		delayedSubmitOp({
		    p: ["layout", "positions", id],
		    oi: position
		});
	    } else {
		delayedSubmitOp({
		    p: ["layout", "positions"],
		    od: id
		});		
	    }
	});

	layout.onSetCollapsed(function(id, collapsed) {
	    /*
	     We don't care about order, but we do care about uniqueness.
	     JSON has no concept of a set, but a map of id -> true will do what we need.
	     */
	    if (collapsed) {
		submitOp({
		    p: ["layout", "collapsed", id],
		    oi: true
		});
	    } else {
		submitOp({
		    p: ["layout", "collapsed", id],
		    od: true
		});
	    }
	});

	layout.onSetOrientation(function(orientation) {
	    submitOp({
		p: ["layout", "orientation"],
		oi: orientation
	    });
	});
    };

    onModelChanged(function() {
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

	coll.onNodeDelete(function(id) {
	    submitOp({
		p: ["nodes", id],
		od: true
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
