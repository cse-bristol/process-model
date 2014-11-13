"use strict";

/*global module, require*/

var callbacks = require("./helpers.js").callbackHandler,
    _ = require("lodash");

/*
 Provides a textbox into which you can type the name of a document to search for it.

 The search results will provide:
 1. A way to create the document if it doesn't exist.

 2. A list of similarly named documents, each of which may be:
 Loaded - replaces the entire process model with the contents of that document.
 Included - adds the content of that document as an immediate child of the root node.
 Deleted - removes that document from the database.
 */
module.exports = function(container) {
    var onLoad = callbacks(),
	onImport = callbacks(),
	onDelete = callbacks(),
	searchF;

    var doc = container.append("div")
	    .attr("id", "document-control");

    var search = doc.append("input")
	.attr("type", "text")
	.attr("id", "document-search")
	.on("input", function(d, i) {
	    if (!searchF) {
		throw new Error("Attempted to use the document search, but no search function has been provided.");
	    }

	    var val = this.value;

	    _.debounce(
		function() {
		    searchF(val, function(names) {
			var results = searchResults.selectAll("li")
				.data(
				    names,
				    function(d, i) {
					return d;
				    }
				);

			// TODO add a row for create if it was missing

			results.exit().remove();

			results.enter().append("li")
			    .classed("document-search-result", true)
			    .text(function(d, i) {
				return d;
			    });

			// TODO load, import, delete buttons which call the appropriate event handlers.
		    });
		},
		500
	    );
	});

    var searchResults = doc.append("ul")
	    .attr("id", "document-search-results");
    
    return {
	onLoad: onLoad.add,
	onImport: onImport.add,
	onDelete: onDelete.add,
	/*
	 f should be a function which takes some search text and a callback. It should escape the search text in a manner appropriate to the backend.
	 */
	provideSearch: function(f) {
	    searchF = f;
	},

	load: function(name) {
	    search.node().value = name;
	    onLoad(name);
	}
    };
    
};

