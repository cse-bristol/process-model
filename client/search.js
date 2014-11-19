"use strict";

/*global module, require*/

var callbacks = require("./helpers.js").callbackHandler,
    _ = require("lodash"),
    d3 = require("d3");

/*
 Provides a temporary search box, which will go away when the user clicks on one of the results.

 alwaysIncludeSearchText is a boolean which, if set true, will cause the value the user search for to always appear in the search results, even if it doesn't exist (useful for save as operations). If it was added in this way, it will have the class .search-result-fabricated.

 currentPage will have the class .search-result-current-page.
 */
module.exports = function(container, searchFunction, alwaysIncludeSearchText, currentPage, callback) {
    var form = container
	    .append("form")
	    .attr("id", "search-control")
    // Search immediately if you hit enter.
	    .on("submit", function(d, i) {
		d3.event.stopPropagation();
		d3.event.preventDefault();
		doSearch();
	    });

    var getSearchValue = function() {
	return search.node().value.toLowerCase().trim();
    };

    var hideResults = function(delay) {
	var maybeTransition = delay ? form.transition().delay(delay) : form;
	maybeTransition.remove();
    };

    var search = form.append("input")
	    .attr("type", "text")
	    .attr("id", "search")
    // Allow a little time for the user to finish typing.
	    .on("input", function(d, i) {
		doSearchSoonish();
	    })
	    .on("blur", function() {
		hideResults(200);
	    });

    // Having a 'submit' input allows you to press enter in the search box to send a search.
    var submit = form.append("input")
    	    .attr("type", "submit")
    	    .style("display", "none");

    var searchResults = form.append("ul")
	    .attr("id", "search-results");    

    var doSearch = function() {
	var val = getSearchValue();

	if (val === "") {
	    return;
	}
	
	searchFunction(val, function(names) {
	    var addedVal = false;
	    
	    if (val !== getSearchValue()) {
		// The user has changed the text since we issued this search.
		return;
	    }

	    if (alwaysIncludeSearchText && names.indexOf(val) < 0) {
		// Add the search text to the top of the list.
		names = [val].concat(names);
		addedVal = true;
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
			hideResults(5);
		    })
		    .classed("search-result-current-page", function(d, i) {
			return d === currentPage;
		    })
		    .classed("search-result-fabricated", function(d, i) {
			return addedVal && d === val;
		    });
	});
    };

    var doSearchSoonish = _.debounce(doSearch, 500);

    search.node().focus();

    return {
	hide: hideResults
    };
};

