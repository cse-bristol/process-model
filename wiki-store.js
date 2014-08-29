"use strict";

/*global require, module*/

var d3 = require("d3"),
    helpers = require("./helpers.js"),
    any = helpers.any,
    maybeNum = helpers.maybeNum,
    maybeBool = helpers.maybeBool;

/*
 Save to and load from a Gitit wiki (see https://github.com/jgm/gitit).
 
 Each node has a page in the wiki.
 In the page is a div with id="content".
 
 We store the properties for each node in a table with a column for each property and a single row containing their values.

 We store the edges for each node in a table. Each row represents 1 edge. There is a child column containing links to each of the children. There may be necessity and sufficiency columns containing properties to go on the edges.

 Other elements in the content div will be saved to the node's description, with the exception of things in the blacklist.

 Security notes:
 Load: when loading from the wiki, d3 parses the request using createContextualFragment (https://developer.mozilla.org/en-US/docs/Web/API/range.createContextualFragment). This does not cause any scripts to be run. We remove elements from the resulting fragment using a blacklist. We also deep clone our node in order to remove event handlers.

 Save: when saving to the wiki, we will rely on the wiki's own server-side security to stop injection of malicious code.
 
 TODO: implement multi-page save in Gitit so that we can do our saves in a transactional way.
 */
module.exports = function(nodes, update, errors, messages) {
    var revisions = d3.map(),
	toLoad,
	edgeData = [],
	/* 
	 loadUrl points to the root node which we will load from.
	 saveUrl points to the base url of the wiki. We will append the name of each node to it when we save.
	 During loading, we look up the base url of the wiki and set saveUrl to equal that. We then use that url to load all the children. */
	loadUrl = "",
	saveUrl = "",
	delay = 0;

    var blackList = [
	// These things need to be removed to prevent suprise execution of things.
	"iframe", 
	"script", 
	"link",
	"object",
	"embed",

	// These things are removed since we've already got the data stored and don't want to put them in the description field.
	".revision", 
	".pageTitle"
    ];

    var secure = function(el) {
	blackList.forEach(function(q) {
	    removeElements(q, el);
	});
	
	// Deep cloning strips event handlers.
	return el.cloneNode(true);
    };

    var checkResponseMessages = function(response, nodeName, errors) {
	var range = document.createRange();
	range.selectNode(document.body);

	forEl(
	    range.createContextualFragment(response),
	    ".messages li", 
	    function(m) {
		if (m.innerHTML.indexOf("This page has been edited since you checked it out.") >= 0) {
		    errors(
			"Cannot save since node " + nodeName + 
			    " at " + saveUrl + 
			    " has been edited since it was loaded.");
		} else {
		    errors(
			"Unknown problem saving " + nodeName + 
			    " at " + saveUrl + 
			    ": " + m.innerHTML);
		}
	    });
    };

    var makeUrl = function(parts) {
	var url = parts[0];
	parts.slice(1).forEach(function(part, i) {
	    if (url[url.length - 1] === "/") {
		if (part[0] === "/") {
		    url += part.slice(1);
		} else {
		    url += part;
		}
	    } else {
		if (part[0] === "/") {
		    url += part;
		} else {
		    url += "/" + part;
		}
	    }
	});
	
	return url;
    };

    var relativizeURL = function(specific, base) {
	var i = specific.lastIndexOf(base);

	if (i >= 0) {
	    return specific.slice(i + base.length);
	} else {
	    return specific;
	}
    };

    var loadCell = function(el) {
	return maybeBool(
	    maybeNum(
		el.innerHTML.toLowerCase()));
    };

    var mapEl = function(parent, tag, f) {
	return Array.prototype.map.call(parent.querySelectorAll(tag), f);
    };

    var forEl = function(parent, tag, f) {
	Array.prototype.forEach.call(parent.querySelectorAll(tag), f);
    };

    var removeElements = function(tag, container) {
	forEl(container, tag, function(el) {
	    el.parentNode.removeChild(el);
	});
    };

    var props = d3.map();
    [
	[
	    // Type must come before any type-specific properties.
	    "type",
	    function load(node) {
		return node.type;
	    },
	    function save(val, node) {
		return node.chooseType(val);
	    }
	],
	"dependence",
	"settled",
	"supports",
	[
	    "evidence", 
	    function load(node) {
		return "[" + node.localEvidence()[0] + "," + node.localEvidence()[1] + "]";
	    },
	    function save(val, node) {
		var parts = val.replace(/\[|\]/g, "").split(",");
		
		return node.localEvidence([
		    maybeNum(parts[0]),
		    maybeNum(parts[1])
		]);
	    }	
	]
    ].forEach(function(p) {
	if (typeof p === "string") {
	    props.set(
		p, 
		{
		    load: function(node) {
			return node[p]();
		    },
		    save: function(val, node) {
			return node[p](val);
		    }
		});
	} else {
	    props.set(
		p[0],
		{
		    load: p[1],
		    save: p[2]
		}
	    );
	}
    });

    var edgeProps = d3.set([
	"necessity",
	"sufficiency"
    ]);

    var filteredProps = function(node) {
	// Eliminate all the properties which aren't valid for the node. 
	return props.keys()
	    .filter(function(p) {
		try {
		    props.get(p).load(node);
		    return true;
		} catch (err) {
		    return false;
		}
	    });
    };

    var loadProps = function(data, columns, rows) {
	/* We'll assume all the property values are stored in the first row. */
	var firstRow = rows[0],
	    foundProp = false;

	columns.forEach(function(c, i) {
	    if (props.has(c)) {
		data.set(
		    c, 
		    loadCell(firstRow[i]));
		foundProp = true;
	    }
	});
	return foundProp;
    };

    var maybeLoadFinished = function() {
	toLoad--;

	if (toLoad === 0) {
	    
	    edgeData.forEach(function(e) {
		// Now that we have loaded all the nodes and know their types, we can put properties on their edges.
		try {
		    var edge = nodes.get(e.parent)
			    .edgeTo(nodes.get(e.child));
		} catch (err) {
		    errors(
			"Error getting connection from " + e.parent 
			    + " to its child " + e.child 
			    + ": " + err
		    );
		}

		e.props.entries().forEach(function(edgeProp) {
		    if (edgeProp.value !== "") {
			try {
			    edge[edgeProp.key](edgeProp.value);
			} catch (err) {
			    errors(
				"Error setting edge property " + edgeProp.key
				    + " to value " + edgeProp.value
				    + " on edge from node " + e.parent
				    + " to child node " + e.child
				    + ": " + err
			    );
			}
		    }
		});
	    });

	    update();
	}
    };

    var loadEdges = function(parentName, columns, rows) {
	var childI = columns.indexOf("child");
	if (childI >= 0 && rows.length > 0) {
	    rows.forEach(function(r) {
		var childName = decodeURIComponent(r[childI].querySelector("a").getAttribute("href")),
		    rowData = d3.map();
		
		columns.forEach(function(c, i) {
		    if (edgeProps.has(c)) {
			rowData.set(
			    c,
			    loadCell(r[i]));
		    }
		});

		loadNode(childName);

		edgeData.push({
		    parent: parentName,
		    child: childName,
		    props: rowData
		});
	    });

	    return true;
	}
	return false;
	
    };

    var markdownTable = function(cols, rows) {
	return "\n" +
	    ([
		cols,
		cols.map(function(c) {return "-";})
	    ]
	     .concat(rows)
	     .map(function(r) {
		 if (!r.join) {
		     throw new Error("Not a valid row " + r);
		 }
		 return "|" + r.join("|") + "|";
	     })
	     .join("\n"));
    };

    var saveEdges = function(node) {
	if (node.edges().length === 0) {
	    return "";
	}

	var anyNecessitySufficiency = any(
	    node.edges(), 
	    function(e) {
		return e.necessity;
	    });

	var columns = ["child"]
		.concat(anyNecessitySufficiency ? ["necessity", "sufficiency"] : []);

	return markdownTable(
	    columns, 
	    node.edges().map(function(e) {
		var row = [
		    "[" + e.node().name() + "]()"
		].concat(anyNecessitySufficiency
			 ? [
			     e.necessity ? e.necessity() : "",
			     e.sufficiency? e.sufficiency() : ""
			 ]
			 : []);
		
		return row;
	    }));
    };

    var saveProps = function(node) {
	var filtered = filteredProps(node);

	return markdownTable(
	    filtered,
	    [
		filtered.map(function(p) {
		    return props.get(p).load(node);
		})
	    ]
	);
    };

    var markdownContent = function(node) {
	return [
	    node.description(),
	    saveProps(node),
	    saveEdges(node)
	].join("\n");
    };

    var postData = function(node) {
	var data = [
	    "editedText=" + markdownContent(node),
	    "logMsg=Process Model Change",
	    "update=Save"
	];

	if (revisions.has(node.name())) {
	    data.push("sha1=" + revisions.get(node.name()));
	}

	return data.join("&");
    };

    var loadNode = function(name) {
	if (nodes.has(name)) {
	    return;
	}

	toLoad++;

	nodes.create("undecided", name);

	// Look at the history of the node to find its most recent history.
	d3.html(
	    makeUrl([
		saveUrl, 
		"_history", 
		name
	    ]), 
	    function(error, html) {
		if (error) {
		    errors(error.response);
		}

		var latest = html.querySelector("#content ul li");
		if (!latest) {
		    errors("Could not find history " + makeUrl([
			saveUrl,
			"_history",
			name
		    ]));
		}
		
		revisions.set(
		    name,
		    latest.getAttribute("revision"));

		// Retrieve the latest revision we found.
		d3.html(
		    makeUrl([
			saveUrl,
			name
		    ]) + "?revision=" + revisions.get(name),
		    function(error, html) {
			if (error) {
			    errors(error.response);
			}

			var propData = d3.map(),
			    wikiContent = secure(html.querySelector("#content")
						 .querySelector("#wikipage"));

			forEl(wikiContent, "table", function(table) {
			    var columns = mapEl(table, "th", loadCell),
				rows = mapEl(table, "tr", function(tr) {
				    return mapEl(tr, "td", function(td) { return td;});
				}).filter(function(row) {
				    // Exclude header rows.
				    return row.length > 0;
				});

			    
			    if (loadProps(propData, columns, rows) || loadEdges(name, columns, rows)) {
				table.parentNode.removeChild(table);
			    }

			});

			props.keys().forEach(function(p) {
			    if (propData.has(p)) {
				try {
				    props.get(p).save(
					propData.get(p),
					// Reload the node each time in case it gets replaced.
					nodes.get(name));
				} catch (err) {
				    errors(
					"Error trying to load property " + p 
					    + " for node " + name 
					    + " of type " + nodes.get(name).type 
					    + ": " + err
				    );
				}
			    }
			});

			var node = nodes.get(name);

			node.description(wikiContent.innerHTML);	
			
			maybeLoadFinished();
		    });
	    });
    };

    var module = {
	loadUrl: function(val) {
	    if (val === undefined) {
		return loadUrl;
	    } else {
		loadUrl = val;
		return module;
	    }
	},
	saveUrl: function(val) {
	    if (val === undefined) {
		return saveUrl;
	    } else {
		saveUrl = val;
		return module;
	    }
	},
	load: function() {
	    d3.html(makeUrl([loadUrl]), function(error, html){
		if (error) {
		    errors(error.response);
		}

		var logo = html.querySelector("#logo");

		if (!logo) {
		    errors("Not the URL of a wiki page " + loadUrl);
		}

		/* We'll want to save to the place we loaded from.  */
		saveUrl = makeUrl([
		    logo
			.getElementsByTagName("a")[0].href
		]);

		/* Loading is going to happen, so clear out all the old stuff.  */
		nodes.reset();
		revisions = d3.map();
		toLoad = 0;

		loadNode(
		    decodeURIComponent(
			relativizeURL(loadUrl, saveUrl)));
	    });
	},
	save: function() {
	    var saves = 0;
	    edgeData = [];

	    nodes.all().forEach(function(n) {
		saves++;

		d3.xhr(
		    makeUrl([
			saveUrl, n.name()
		    ]))
		    .header("Content-Type", "application/x-www-form-urlencoded")
		    .post(postData(n), function onSaveComplete(error, response) {
			if (error) {
			    if (error.response === "Server error: ResourceExists") {
				errors("Attempted to save page " + n.name()
				       + " as a new page, but it already exists.");
			    } else {
				errors(error.response);
			    }
			}

			checkResponseMessages(response.response, n.name(), errors);

			saves--;

			if (saves === 0) {
			    messages("Finished saving process diagram to wiki at " + saveUrl + "/" + nodes.root().name());
			    module.load();
			}
		    });
	    });
	}
    };

    return module;
};