"use strict";

/*global module, require*/

var d3 = require("d3"),
    URL = require("url");

module.exports = function(search) {
    var fromURL = function() {
	var query = URL.parse(window.location.href, true).query;

	if (query.name !== undefined) {
	    var title = decodeURIComponent(query.name);
	    search.load(title);
	    document.title = title;
	}
    };

    var toURL = function(name) {
	var url = URL.parse(window.location.href, true),
	    query = url.query;

	var encodedName = encodeURIComponent(name);

	if (encodedName !== query.name) {
	    query.name = encodedName;
	    url.search = null;
	    window.history.pushState(null, "", URL.format(url));
	    document.title = name;
	}
    };

    d3.select(window).on("popstate", fromURL);    
    search.onLoad(toURL);
    
    fromURL();
};
