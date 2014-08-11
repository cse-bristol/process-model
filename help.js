"use strict";

/*global require, module*/

var d3 = require("d3");

module.exports = function(container) {
    var loaded = [],
	expected = 0,
	textDiv = container.append("div").classed("help-text", true);

    var nodeTypeHelp = function() {
	return "<h3>Types of Node</h3>"
	    + "<p style=\"color:red;\">TODO</p>";
    };


    var loadThis = function(fileName, position) {
	expected++;

	d3.xhr(fileName, function(err, result) {
	    if (err) {
		throw err;
	    }
	    
	    loaded[position] = result.response;

	    expected--;

	    if (expected === 0) {
		textDiv.html(loaded.join(" "));
	    }
	});
    };

    loadThis('./help-content/part1.html', 0);
    loaded[1] = nodeTypeHelp();
    loadThis('./help-content/part2.html', 2);
};