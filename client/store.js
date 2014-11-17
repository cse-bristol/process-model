"use strict";

/*global module, require*/

var _ = require("lodash"),
    sharejs = require('./node_modules/share/lib/client/index.js'),
    BCSocket = require('./node_modules/browserchannel/dist/bcsocket-uncompressed.js').BCSocket,
    helpers = require("./helpers"),
    jsonData = require("./data.js"),
    serializeNode = jsonData.serializeNode,
    serializeEdge = jsonData.serializeEdge,
    callbacks = helpers.callbackHandler,
    noop = helpers.noop,
    coll = "process-models",
    url = function() {
	var a = document.createElement("a");
	a.href = "/";
	return a.href + "channel";
    }();

module.exports = function(search, onNodeCollectionChanged, getNodeCollection, setNodeCollectionAndLayout) {
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

    connection.debug = true;

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
	/*
	 I've chosen not to hook up the chooseType function in here. This means that a node changes identity when it changes type, which is probably ok since it has no interesting properties on it.
	 */   
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

    onNodeCollectionChanged(function() {
	getNodeCollection().onCreate(function(node) {
	    hookNode(node);
	    context.submitOp(
		[{
		    p: ["nodes", node.id],
		    oi: serializeNode(node)
		}],
		noop
	    );
	});

	getNodeCollection().onDelete(function(type, o) {
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

	doc.subscribe();
	doc.on("after op", function(op, context) {
	    // TODO subscribe to new events
	    console.log("after op");
	});
    });

    search.onImport(function(name) {
	name.toLowerCase();
	// TODO fetch the document and add it as a subnode of the root node.
    });

    search.onDelete(function(name) {
	name = name.toLowerCase();
	if (name === doc.name) {
	    doc.del();
	    doc.destroy();
	    // TODO make a new layout and node collection here
	    opQueue = [];
	    doc = null;
	    context = {submitOp: function(op) {
		opQueue.push(op);
	    }};
	} else {
	    var toDelete = connection.get(coll, name.toLowerCase());
	    toDelete.subscribe();
	    toDelete.whenReady(function() {
		toDelete.del();
		toDelete.destroy();
	    });
	}
    });

    search.provideSearch(function(text, callback, errback) {
	// TODO *insecure*. Anyone could modify the Javascript in arbitrary ways here. Can we fire this from the server side and sanitize the text variable?
	connection.createFetchQuery(coll, {_id: {$regex: "^" + text}}, {}, function(error, results, extraData) {
	    if (error) {
		errback(error);
	    } else {
		callback(_.pluck(results, "name"));
	    }
	});
    });
};
