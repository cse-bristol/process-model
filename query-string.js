"use strict";

/*global module, require*/

var d3 = require("d3"),
    URL = require("url");

module.exports = function(update, nodes, wikiStore, errors) {
    var listening = true;

    var load = function() {
	var query = URL.parse(window.location.href, true).query;

	if (query.root === undefined) {
	    nodes.root(
		nodes.create("process"));
	    update();
	} else {
	    wikiStore.loadPage(decodeURIComponent(query.root));
	}
    };

    d3.select(window).on("popstate", function() {
	listening = false;
	load();
	update();
	listening = true;
    });

    return {
	load: load,
	save: function() {
	    if (listening) {
		var url = URL.parse(window.location.href, true),
		    query = url.query,
		    changes = false;

		if (query.root !== "models/" + nodes.root().name()) {
		    query.root = "models/" + nodes.root().name();
		    changes = true;
		}
	    }

	    if (changes) {
		url.search = null,
		window.history.pushState(null, "", URL.format(url));
	    }
	}
    };
};
