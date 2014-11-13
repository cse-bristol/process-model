"use strict";

/*global module, require*/

var sharejs = require('share').client,
    browserChannelSocket = require('browserchannel').BCSocket,
    coll = "process-models";

module.exports = function(search, nodes) {
    // URL? What should it be?
    var connection = sharejs.Connection(
	browserChannelSocket(
	    null,
	    {
		reconnect: true
	    })
    ),
	doc;

    search.onLoad(function(name) {
	if (doc !== null) {
	    doc.destroy();
	}

	doc = connection.get(coll, name);
	doc.whenReady(function() {
	    doc.getSnapshot();

	    // TODO clear out the node graph, rebuild it from the JSON.
	    // TODO subscribe to new events
	});
	doc.subscribe();

    });

    search.onImport(function(name) {
	// TODO fetch the document and add it as a subnode of the root node.
    });

    search.onDelete(function(name) {
	// Deletion is completely independent of the currently loaded document.
	var toDelete = connection.get(coll, name);
	toDelete.del();
	toDelete.destroy();
    });

    search.provideSearch(function(text, callback) {
	// TODO what is index?
	// TODO escape text and use it to query the name of the document
	connection.createFetchQuery(index, text, {}, function(documents) {
	    // TODO call callback with the titles of the documents
	});
    });
};
