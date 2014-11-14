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
    // TODO: URL? What should it be?
    var connection = new sharejs.Connection(
	new BCSocket(
	    url,
	    {
		reconnect: true
	    })
    ),
	doc;

    search.onLoad(function(name) {
	if (doc) {
	    doc.destroy();
	}

	doc = connection.get(coll, name.toLowerCase());
	doc.whenReady(function() {
	    var snap = doc.getSnapshot();
	    if (!snap) {
		doc.create("json0", {model: {}, layout: {}});
	    }

	    // TODO clear out the node graph, rebuild it from the JSON.
	    // TODO subscribe to new events
	});
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
	// TODO escape text and use it to query the name of the document
	connection.createFetchQuery(coll, text, {}, function(error, results, extraData) {
	    if (error) {
		errback(error);
	    } else {
		callback(_.pluck(results, "name"));
	    }
	});
    });
};
