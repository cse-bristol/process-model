"use strict";

/*global module, require*/

var _ = require("lodash"),
    sharejs = require('./node_modules/share/lib/client/index.js'),
    BCSocket = require('./node_modules/browserchannel/dist/bcsocket-uncompressed.js').BCSocket,
    helpers = require("./helpers"),
    callbacks = helpers.callbackHandler,
    noop = helpers.noop,
    coll = "process-models",
    url = function() {
	var a = document.createElement("a");
	a.href = "/";
	return a.href + "channel";
    }();

/*
 Nodes are stored by their id.
 */
var serializeNode = function(node) {
    var n = {
	name: node.name(),
	description: node.description(),
	type: node.type,
	edges: serializeEdges(node.edges())
    };

    if (node.settled) {
	n.settled = node.settled();
    }

    if (node.dependence) {
	n.dependence = node.dependence();
    }

    if (node.support) {
	n.support = node.support();
    }

    if (node.localEvidence && node.isLeaf) {
	n.localEvidence = node.localEvidence();
    }

    return n;
};

/*
 Edges are stored on each node by the id of their target.
 */
var serializeEdges = function(edges) {
    var r = {};
    
    edges.forEach(function(e) {
	r[e.node().id] = serializeEdge(e);
    });
    
    return r;
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

module.exports = function(search, nodes) {
    var connection = new sharejs.Connection(
	new BCSocket(
	    url,
	    {
		reconnect: true
	    })
    ),
	doc,
	opQueue = [],
	context = {submitOp: function(op) {
	    opQueue.push(op);
	}};

    var hook = function(o, makePath, serialize, prop) {
	if (o[prop]) {
	    var wrapped = o[prop];
	    o[prop] = function() {
		var args = arguments;

		if (arguments.length) {
		    var oldVal = serialize(o),
			returnVal = wrapped.apply(this, arguments),
			newVal = serialize(o);

		    context.submitOp(
			[{
			    p: makePath(),
			    od: oldVal,
			    oi: newVal
			}],
			noop
		    );

		    return returnVal;
		} else {
		    return wrapped();
		}
	    };
	}
    };

    var hookNode = function(node) {
	var makePath = function() {
	    return ["nodes", node.id];
	};

	["name", "localEvidence", "dependence", "settled", "support"]
	    .forEach(function(p) {
		hook(node, makePath, serializeNode, p);
	    });

	node.onEdgeTo(function(edge) {
	    context.submitOp(
		[{
		    p: makePath().concat(["edges", edge.node().id]),
		    oi: serializeEdge(edge)
		}],
		noop
	    );
	    hookEdge(edge);
	});

	// TODO chooseType is complicated because the current behaviour recreates the node
	// TODO description should use the text interface
    };

    var hookEdge = function(edge) {
	var makePath = function() {
	    return ["nodes", edge.parent().id, edge.node().id];
	};

	["necessity", "sufficiency"]
	    .forEach(function(p) {
		hook(edge, makePath, serializeEdge, p);
	    });
	
	edge.onDisconnect(function() {
	    context.submitOp(
		[{
		    p: makePath(),
		    od: serializeEdge(edge)
		}],
		noop
	    );
	});
    };

    nodes.onCreate(function(node) {
	hookNode(node);
	context.submitOp(
	    [{
		p: ["nodes", node.id],
		oi: serializeNode(node)
	    }],
	    noop
	);
    });

    nodes.onDelete(function(type, o) {
	if (type === "edge") {
	    context.submitOp(
		[{
		    p: ["nodes", o.parent().id, o.node().id],
		    od: serializeEdge(o)
		}],
		noop
	    );
	    
	} else if (type === "node") {
	    context.submitOp(
		[{
		    p: ["nodes", o.id],
		    od: o
		}],
		noop	     
	    );
	} else {
	    throw new Error("Unknown type " + type);
	}
    });

    nodes.onRoot(function(rootNode, previousRootNode) {
	var op = {
	    p: ["root"],
	    oi: rootNode.id
	};

	if (previousRootNode) {
	    op.od = previousRootNode.id;
	}
	
	context.submitOp(
	    [op],
	    noop
	);
    });

    search.onLoad(function(name) {
	if (doc) {
	    doc.destroy();
	}

	doc = connection.get(coll, name.toLowerCase());
	doc.whenReady(function() {
	    var snap = doc.getSnapshot();
	    if (snap) {
		context = doc.createContext();
		// TODO clear out the node graph, rebuilt it from history.
	    } else {
		doc.create(
		    "json0",
		    {
			nodes: {},
			layout: {
			    collapsed: [],
			    sizes: {
			    },
			    positions: {
			    }
			}
		    });
		
		context = doc.createContext();
		// Submit all the operations which made up the document.
		opQueue.forEach(function(op) {
		    context.submitOp(op, noop);
		});
		opQueue = [];
	    }

	});
	// TODO subscribe to new events
	doc.subscribe();

    });

    search.onImport(function(name) {
	name.toLowerCase();
	// TODO fetch the document and add it as a subnode of the root node.
    });

    search.onDelete(function(name) {
	// Deletion does not change the document which is loaded, unless it's the current document.
	// TODO handle the case when we are deleting the current document?
	var toDelete = connection.get(coll, name.toLowerCase());
	toDelete.del();
	toDelete.destroy();
    });

    search.provideSearch(function(text, callback, errback) {
	// TODO *insecure*. Anyone could modify the Javascript in arbitrary ways here. Can we fire this from the server side and sanitize the text variable?
	connection.createFetchQuery(coll, {_id: text}, {}, function(error, results, extraData) {
	    if (error) {
		errback(error);
	    } else {
		callback(_.pluck(results, "name"));
	    }
	});
    });
};
