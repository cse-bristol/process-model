"use strict";

/*global module, require*/

var _ = require("lodash"),
    sharejs = require('./node_modules/share/lib/client/index.js'),
    BCSocket = require('./node_modules/browserchannel/dist/bcsocket-uncompressed.js').BCSocket,
    collectionFactory = require("./nodes/node-collection.js"),
    layoutFactory = require("./layout.js"),
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

module.exports = function(search, onNodeCollectionChanged, getNodeCollection, getLayout, setNodeCollectionAndLayout, freshNodeCollectionAndLayout) {
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
    };

    onNodeCollectionChanged(function() {
	var coll = getNodeCollection();
	
	coll.onNodeCreate(function(node) {
	    hookNode(node);
	    context.submitOp(
		[{
		    p: ["nodes", node.id],
		    oi: serializeNode(node)
		}],
		noop
	    );
	});

	coll.onNodeDelete(function(node) {
	    context.submitOp(
		[{
		    p: ["nodes", node.id],
		    od: node
		}],
		noop	     
	    );
	});

	coll.onEdgeCreate(function(edge) {
	    context.submitOp(
		[{
		    p: ["nodes", edge.parent().id, "edges", edge.node().id],
		    oi: serializeEdge(edge)
		}],
		noop
	    );
	    hookEdge(edge);
	});

	coll.onEdgeDelete(function(edge) {
	    context.submitOp(
		[{
		    p: ["nodes", edge.parent().id, "edges", edge.node().id],
		    od: serializeEdge(edge)
		}],
		noop
	    );
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
		setNodeCollectionAndLayout(
		    jsonData.deserialize(snap)
		);
		
		context = doc.createContext();
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
	var toImport = connection.get(coll, name.toLowerCase());
	toImport.subscribe();
	toImport.whenReady(function() {
	    var snap = doc.getSnapshot();
	    if (snap) {
		var deserialized = jsonData.deserialize(snap);
		getNodeCollection().root().edgeTo(
		    deserialized.nodes.root()
		);
		getLayout().merge(deserialized.layout);
	    } else {
		throw new Error("Attempted to import a collection, but it has been deleted " + snap);
	    }
	});
    });

    search.onDelete(function(name) {
	name = name.toLowerCase();
	if (name === doc.name) {
	    doc.del();
	    doc.destroy();
	    opQueue = [];
	    doc = null;
	    context = {submitOp: function(op) {
		opQueue.push(op);
	    }};
	    freshNodeCollectionAndLayout();
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
