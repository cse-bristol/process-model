"use strict";

/*global module, require*/

var d3 = require("d3"),
    URL = require("url");

module.exports = function(search) {
    var fromURL = function() {
	var query = URL.parse(window.location.href, true).query;

	if (query.name !== undefined) {
	    search.load(decodeURIComponent(query.name));
	}
    };

    var toURL = function(name) {
	var url = URL.parse(window.location.href, true),
	    query = url.query;

	var encodedName = encodeURIComponent(name);

	if (encodedName !== query.name) {
	    query.name = encodedName;
	    window.history.pushState(null, "", URL.format(url));
	}
    };

    d3.select(window).on("popstate", fromURL);    
    search.onLoad(toURL);
    
    fromURL();
};
