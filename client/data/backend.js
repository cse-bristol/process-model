"use strict";

/*global module, require*/

var sharejs = require('../node_modules/share/lib/client/index.js'),
    BCSocket = require('../node_modules/browserchannel/dist/bcsocket-uncompressed.js').BCSocket,
    coll = "process-models",
    url = function() {
	var a = document.createElement("a");
	a.href = "/";
	return a.href + "channel";
    }();

/*
 Connects to a sharejs server.

 Exposes some functions about it.
 */
module.exports = function() {
    var connection = new sharejs.Connection(
	new BCSocket(
	    url,
	    {
		reconnect: true
	    })
    );

    connection.debug = true;

    return {
	search: function(text, callback, errback) {
	    // TODO *insecure*. Anyone could modify the Javascript in arbitrary ways here. Can we fire this from the server side and sanitize the text variable?
	    connection.createFetchQuery(coll, {_id: {$regex: text}}, {}, function(error, results, extraData) {
		if (error) {
		    errback(error);
		} else {
		    callback(_.pluck(results, "name"));
		}
	    });
	},

	load: function(name, callback) {
	    var doc = connection.get(coll, name.toLowerCase());
	    doc.subscribe();
	    doc.whenReady(function() {
		callback(doc);
	    });
	},

	deleteDoc: function(name) {
	    var toDelete = connection.get(coll, name.toLowerCase());
	    toDelete.subscribe();
	    toDelete.whenReady(function() {
		toDelete.del();
		toDelete.destroy();
	    });
	}
    };
};
