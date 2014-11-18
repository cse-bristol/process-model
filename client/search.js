"use strict";

/*global module, require*/

var callbacks = require("./helpers.js").callbackHandler,
    _ = require("lodash"),
    d3 = require("d3");

/*
 Provides a temporary search box, which will go away when the user clicks on one of the results.

 alwaysIncludeSearchText is a boolean which, if set true, will cause the value the user search for to always appear in the search results, even if it doesn't exist (useful for save as operations).
 */
module.exports = function(container, searchFunction, alwaysIncludeSearchText, callback) {
    var form = container
	    .append("form")
	    .attr("id", "search-control");

    var getSearchValue = function() {
	return search.node().value.toLowerCase().trim();
    };

    var hideResults = function(delayed) {
	var maybeTransition = delayed ? form.transition().delay(200) : form.transition().delay(10);
	maybeTransition.remove();
    };

    var search = form.append("input")
	    .attr("type", "text")
	    .attr("id", "search")
    // Allow a little time for the user to finish typing.
	    .on("input", doSearchSoonish)
    // Search immediately if you hit enter.
	    .on("submit", doSearch)
	    .on("blur", function() {
		hideResults(true);
	    });

    // Having a 'submit' input allows you to press enter in the search box to send a search.
    var submit = form.append("input")
	    .attr("type", "submit")
	    .style("visibility", "hidden");

    var searchResults = form.append("ul")
	    .attr("id", "search-results");    

    var doSearch = function() {
	var val = getSearchValue();

	if (val === "") {
	    return;
	}
	
	searchFunction(val, function(names) {
	    if (val !== getSearchValue()) {
		// The user has changed the text since we issued this search.
		return;
	    }

	    if (alwaysIncludeSearchText && names.indexOf(val) < 0) {
		// Add the search text to the top of the list.
		names = [val].concat(names);
	    }
	    
	    var results = searchResults.selectAll("li")
		    .data(
			names,
			function(d, i) {
			    return d;
			}
		    );

	    results.exit().remove();

	    var newResults = results.enter().append("li")
		    .classed("search-result", true)
		    .text(function(d, i) {
			return d;
		    })
		    .on("click", function(d, i) {
			callback(d);
			hideResults(false);
		    });
	});
    };

    var doSearchSoonish = _.debounce(doSearch, 500);

    search.node().focus();
};

