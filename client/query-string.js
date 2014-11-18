"use strict";

/*global module, require*/

var d3 = require("d3"),
    URL = require("url");

module.exports = function(documentControl) {
    var fromURL = function() {
	var query = URL.parse(window.location.href, true).query;

	if (query.name) {
	    var title = decodeURIComponent(query.name);
	    documentControl.open(title);
	    document.title = title;
	} else {
	    documentControl.newDoc();
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
	    document.title = name + " - Process Model";
	}
    };

    d3.select(window).on("popstate", fromURL);
    
    documentControl.onNew(toURL);
    documentControl.onOpen(toURL);
    documentControl.onSaveAs(toURL);
    
    fromURL();
};
