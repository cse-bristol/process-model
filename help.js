"use strict";

/*global require, module*/

var d3 = require("d3"),
    types = require("./nodes/process-node.js"),
    nodes = require("./nodes/abstract-node.js")();

var propertyNames = d3.map({
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

var altKeyNames = d3.map({
    " ": "space"
});

var makeExampleEdge = function(typedNode) {
    var child = nodes.create("undecided"),
	edge = typedNode.edgeTo(child);
    
    typedNode.extendIncomingEdge(edge);
    return edge;    
};

var keypress = function(shortcut) {
    var text = "&lt;" + (altKeyNames.has(shortcut.key) ? altKeyNames.get(shortcut.key) : shortcut.key) + "&gt;";

    ["shift", "alt", "ctrl", "meta"].forEach(function(modifier) {
	if (shortcut[modifier + "Key"] !== undefined) {
	    text += " with &lt;" + modifier + "&gt;";
	}
    });

    return text;
};

var nodeTypeHelp = function() {
    var result = [
	h(3, "Types of Node")
    ];

    var shortcutHelp = function(property) {
	if (property.keys) {
	    var shortcuts = property.keys.map(function(shortcut) {
		return keypress(shortcut) + " to " + shortcut.description;
	    });
	    return p("(" + shortcuts.join(", ")  + ")");
	} else {
	    return "";
	}
    };

    var propertyHelp = function(example) {
	var properties = Object.keys(example)
	    .filter(function(key) {
		return example[key].help !== undefined;
	    })
	    .map(function(key) {
		return tag("li", 
			   h(5, propertyNames.has(key) ? propertyNames.get(key) : key) 
			   + p(example[key].help)
			   + shortcutHelp(example[key]));
	    });

	if (properties.length === 0) {
	    return "";
	} else {
	    return tag("ul", properties.join(" "));
	}
    };

    var edgeHelp = function(node) {
	var edge = makeExampleEdge(node),
	    edgeProperties = Object.keys(edge)
		.filter(function(key) {
		    return edge[key].help !== undefined;
		})
		.map(function(key) {
		    return tag("li", 
			       h(6, key)
			       + edge[key].help
			       + shortcutHelp(edge[key]));
		});
	
	if (edgeProperties.length === 0) {
	    return "";
	} else {
	    return h(5, "incoming edge properties for " + node.type)
		+ tag("ul", edgeProperties.join(""));
	}
    };

    var typeHelp = function(type) {
	var example = nodes.create(type),
	    children = example.allowedChildren.empty() > 0 ?
		"Cannot have children" :
		"Possible children: " + example.allowedChildren.values().join("; ");
	
	return [
	    h(4, type),
	    p(example.help),
	    p(children),
	    propertyHelp(example),
	    edgeHelp(example)
	    ].join(" ");
    };

    return result.concat(
	types.keys().map(typeHelp))
	.join(" ");
};

var shortcutHelp = function(shortcutKeys) {
    return h(2, "General Shortcut Keys")
	+ tag("ul", 
	      tag("li", "tab repeatedly to switch edit fields, saving the any changes you make as you go")
	      + shortcutKeys.map(function(shortcut) {
		  return tag("li", keypress(shortcut) + " to " + shortcut.description);
	      }).join(""));
};

var nodeShortcutHelp = function() {
    var example = nodes.create("process");
    return h(3, "Node Shortcut Keys")
	+ tag("ul", example.keys.map(function(shortcut) {
	    return tag("li", keypress(shortcut) + " to " + shortcut.description);
	}).join(""));
};

var edgeShortcutHelp = function() {
    var node = nodes.create("process"),
	edge = makeExampleEdge(node);

    return h(3, "Edge Shortcut Keys")
	+ tag("ul", edge.keys.map(function(shortcut) {
		 return tag("li", keypress(shortcut) + " to " + shortcut.description);
	     }).join(""));
};

module.exports = function(container, shortcutKeys) {
    var loaded = [],
	expected = 0;

    var loadThis = function(fileName, position) {
	expected++;

	d3.xhr(fileName, function(err, result) {
	    if (err) {
		throw err;
	    }
	    
	    loaded[position] = result.response;

	    expected--;

	    if (expected === 0) {
		var html = "<!DOCTYPE html>\r\n" 
			+ tag("html", 
			      loaded.join(""));
		
		container
		    .attr("href", "data:text/html," + encodeURIComponent(html));
	    }
	});
    };

    loaded[0] = h(1, "Help");
    loaded[1] = shortcutHelp(shortcutKeys);
    loadThis('./help-content/part1.html', 2);
    loaded[3] = nodeShortcutHelp();
    loaded[4] = edgeShortcutHelp();
    loaded[5] = nodeTypeHelp();
    loadThis('./help-content/part2.html', 6);
};