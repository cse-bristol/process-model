"use strict";

/*global module, require*/

var _ = require("lodash"),
    sharejs = require('./node_modules/share/lib/client/index.js'),
    BCSocket = require('./node_modules/browserchannel/dist/bcsocket-uncompressed.js').BCSocket,
    coll = "process-models",
    url = function() {
	var a = document.createElement("a");
	a.href = "/";
	return a.href + "channel";
    }();

module.exports = function(search, nodes) {
    var connection = new sharejs.Connection(
	new BCSocket(
	    url,
	    {
		reconnect: true
	    })
    ),
	doc;

    var nodeDict = function() {
	var dict = {};

	nodes.all().forEach(function(n) {
	    dict[n.id()] = {
		name: n.name(),
		type: n.type
	    };
	});

	return dict;
    };

    search.onLoad(function(name) {
	if (doc) {
	    doc.destroy();
	}

	doc = connection.get(coll, name.toLowerCase());
	doc.whenReady(function() {
	    var snap = doc.getSnapshot();
	    if (snap) {
		// TODO clear out the node graph, rebuild it from the JSON.
	    } else {
		doc.create(
		    "json0",
		    {
			nodes: nodeDict(),
			layout: {
			    collapsed: [],
			    sizes: {
			    },
			    positions: {
			    }
			}
		    });
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
	// Deletion is completely independent of the currently loaded document.
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
