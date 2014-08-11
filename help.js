"use strict";

/*global require, module*/

var d3 = require("d3"),
    types = require("./nodes/process-node.js"),
    nodes = require("./nodes/abstract-node.js")();

var propertyNames = d3.map({
    "extendIncomingEdge" : "edge-properties",
    "p" : "propagated-evidence"
});

var tag = function(tag, contents) {
    return "<" + tag + ">" + contents + "</" + tag + ">";
};

var h = function(num, contents) {
    return tag("h" + num, contents);
};

var p = function(contents) {
    return tag("p", contents);
};

var nodeTypeHelp = function() {
    var result = [
	h(3, "Types of Node")
    ];

    var propertyHelp = function(example) {
	var properties = Object.keys(example)
	    .filter(function(key) {
		return example[key].help !== undefined;
	    })
	    .map(function(key) {
		return tag("dt", propertyNames.has(key) ? propertyNames.get(key) : key) 
		    + tag("dd", example[key].help);
	    });

	if (properties.length === 0) {
	    return "";
	} else {
	    return tag("dl", properties.join(" "));
	}
    };

    var typeHelp = function(type) {
	var example = nodes.create(type),
	    children = example.allowedChildren.empty() > 0 ?
		"Cannot have children" :
		"Children: " + example.allowedChildren.values().join("; ");
	
	return [
	    h(4, type),
	    p(example.help),
	    p(children),
	    propertyHelp(example)
	    ].join(" ");
    };

    return result.concat(
	types.keys().map(typeHelp))
	.join(" ");
};

module.exports = function(container) {
    var loaded = [],
	expected = 0,
	textDiv = container.append("div").classed("help-text", true);

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