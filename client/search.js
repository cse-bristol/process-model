"use strict";

/*global module, require*/

var callbacks = require("./helpers.js").callbackHandler,
    _ = require("lodash"),
    d3 = require("d3");

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

    var doc = container
	    .append("div")
	    .attr("id", "document-control");

    var getSearchValue = function() {
	return search.node().value.toLowerCase().trim();
    };

    var getData = function(names) {
	var seen = false,
	    val = getSearchValue(),
	    data = names.map(function(n) {
		if (n === val) {
		    seen = true;
		}
		
		return [n, true];
	    });

	if (!seen) {
	    data.splice(0, 0, [val, false]);
	}
	
	return data;
    };

    var hideResults = function(delayed) {
	var maybeTransition = delayed ? searchResults.transition().delay(200) : searchResults.transition().delay(10);
	maybeTransition.style("visibility", "hidden");
    };

    var doSearch = _.debounce(
	function() {
	    var val = getSearchValue();
	    
	    searchF(val, function(names) {
		var results = searchResults.selectAll("li")
			.data(
			    getData(names),
			    function(d, i) {
				return d[0] + d[1];
			    }
			);

		results.exit().remove();

		var newResults = results.enter().append("li")
			.classed("document-search-result", true)
			.on("mouseenter", function(d, i) {
			    var el = d3.select(this),
				val = d[0];
			    
			    if (d[1]) {
				el.append("button")
				    .classed("search-result-button", true)
				    .text("Load")
				    .on("click", function(d, i) {
					onLoad(val);
					hideResults();
				    });

				el.append("button")
				    .classed("search-result-button", true)
				    .text("Import")
				    .on("click", function(d, i) {
					onImport(val);
					hideResults();
				    });

				el.append("button")
				    .classed("search-result-button", true)
				    .text("Delete")
				    .on("click", function(d, i) {
					onDelete(val);
					hideResults();
				    });
				
			    } else {
				el.append("button")
				    .classed("search-result-button", true)
				    .text("Create")
				    .on("click", function(d, i) {
					onLoad(val);
					hideResults();
				    });
			    }
			})
			.on("mouseleave", function(d, i) {
			    var buttons = d3.select(this)
				    .selectAll(".search-result-button")
				    .remove();
			})
			.append("div")
			.classed("document-search-result-text", true)
			.text(function(d, i) {
			    return d[0];
			});

		var buttons = newResults.enter().append();
	    });
	}, 500
    );

    var search = doc.append("input")
	    .attr("type", "text")
	    .attr("id", "document-search")
	    .on("input", function(d, i) {
		if (!searchF) {
		    throw new Error("Attempted to use the document search, but no search function has been provided.");
		}

		doSearch();
	    })
	    .on("blur", function() {
		hideResults(true);
	    })
	    .on("focus", function() {
		doSearch();
		searchResults.style("visibility", "visible");
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
	    onLoad(name);
	}
    };
    
};

