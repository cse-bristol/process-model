"use strict";

/*global require, module*/

var d3 = require("d3"),
    interopModule = require("gitit-interop"),
    types = require("./nodes/process-node.js").keys();

/*
 Save to and load from a Gitit wiki (see https://github.com/jgm/gitit).
 
 Each node has a page in the wiki.
 In the page is a div with id="content".
 
 We store the properties for each node in a table with a column for each property and a single row containing their values.

 We store the edges for each node in a table. Each row represents 1 edge. There is a child column containing links to each of the children. There may be necessity and sufficiency columns containing properties to go on the edges.

 Other elements in the content div will be saved to the node's description.
 */
module.exports = function(nodes, update, container, buttonContainer, errors, messages) {
    var interop = interopModule(errors),
	s = interop.schema,
	float = s.float,
	choices = s.choices,
	boolean = s.boolean,
	multiple = s.multiple,
	list = s.list,
	optional = s.optional,
	pageLink = s.pageLink,
	
	schema = {
	    edges: multiple({
		child: pageLink,
		necessity: optional(float(0, 1)),
		sufficiency: optional(float(0, 1))
	    }),
	    node: {
		type: choices(types),
		dependence: optional(float(0, 1)),
		settled: optional(boolean),
		support: optional(boolean),
		evidence: optional(list(float(0, 1)))
	    }
	};

    var loadNode = function(name, pages) {
	if (nodes.has(name)) {
	    return nodes.get(name);
	} else {
	    if (pages.has(name)) {
		var page = pages.get(name);

		if (page.has("node")) {
		    var nodeData = page.get("node"),
			type = nodeData.get("type"),
			node = nodes.create(type, name);

		    Object.keys(schema.node).forEach(function(prop) {
			if (prop !== "type" 
			    && node[prop] !== undefined 
			    && nodeData.has(prop)) {
			    
			    node[prop](nodeData.get(prop));
			}
		    });

		    if (page.has("edges")) {
			page.get("edges").forEach(function(edgeData){
			    var child = loadNode(
				edgeData.get("child"),
				pages),
				edge = node.edgeTo(child);
			    
			    Object.keys(schema.edges).forEach(function(prop) {
				if (prop !== "child" 
				    && edge[prop] !== undefined 
				    && edgeData.has(prop)) {
			    
				    edge[prop](edgeData.get(prop));
				}
			    });
			});
		    }

		    if (page.has("other")) {
			var desc = page.get("other").innerHTML.trim();
			if (desc) {
			    node.description(desc);
			}
		    }

		    return node;
		} else {
		    errors("Node page was missing information about the type of node " + node);
		    return null;
		}
		

	    } else {
		errors("Failed to load node " + node);
		return null;
	    }
	}
    };

    var wikiLoad = function(page) {
	interop.parser.loadPagesStartingFrom(
	    page,
	    schema,
	    function(pageData, fileData) {
		nodes.reset();
		loadNode(page, pageData);
		update();
	    },
	    errors
	);
    };

    var saveNode = function(node) {
	var data = {
	    name: node.name(),
	    content: {
		other: node.description(),
		node: {
		    type: node.type
		},
		edges: node.edges().map(function(e) {
		    var d = {
			child: e.node().name()
		    };

		    if (e.necessity !== undefined) {
			d.necessity = e.necessity();
		    }
		    if (e.sufficiency !== undefined) {
			d.sufficiency = e.sufficiency();
		    }
		    
		    return d;
		})
	    }
	};

	Object.keys(schema.node).forEach(function(prop) {
	    if (prop !== "type"
		&& node[prop] !== undefined) {
		
		data.content.node[prop] = node[prop]();
	    };
	});

	data.content = interop.parser.pageAsMarkdown(data.content, schema);

	return data;
    };

    var wikiSave = function(logMessage) {
	interop.requests.save(
	    nodes.all().map(saveNode),
	    [],
	    logMessage,
	    messages,
	    errors
	);
    };

    interop.makeDisplay(
	container, 
	buttonContainer,
	wikiSave,
	wikiLoad,
	messages,
	function() {
	    return "Process " + nodes.root().name();
	}
    );

    return {
	baseURL: function() {
	    return interop.requests.baseURL.apply(this, arguments);
	},
	baseURLValid: function() {
	    return interop.requests.baseURLValid.apply(this, arguments);
	},
	loadPage: function(page) {
	    wikiLoad(page);
	}
    };
};