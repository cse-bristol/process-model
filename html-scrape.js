"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

// result.evidence = JSON.parse(evidenceCell.innerHtml);

ProcessModel.Scrape = function(nodes){
    var num = function(el) {
	return parseFloat(el.childNodes[0].data);
    };

    var isUrlAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i');
    var isAbsolute = function(url) {
	return isUrlAbsolute.test(url);
    };

    var identifyColumns = function(table, columns) {
	var th = table.getElementsByTagName("th"),
	    columnNumbers = d3.map(),
	    i = 0;

	Array.prototype.forEach.call(th, function(header){
	    var text = header.innerHTML.toLowerCase();

	    if (columns.indexOf(text) >= 0) {
		columnNumbers.set(text, i);
	    }
	    i++;
	});

	if (columnNumbers.values().length === columns.length) {
	    return columnNumbers;
	}
	return null;
    };

    var getRelevantCells = function(row, columnNumbers) {
	var cells = row.getElementsByTagName("td"),
	    data = d3.map();
	if (cells.length === 0) {
	    return null; // This is probably a header row.
	}
	
	try {
	    columnNumbers.entries().forEach(function(e){
		data.set(e.key, cells[e.value]);
	    });
	    return data;
	} catch (err) {
	    console.log("Not a valid row " + row.html + " because " + err);
	    return null;
	}
    };

    var parseTitle = function(doc, query, url) {
	if (doc.title) {
	    return doc.title;
	}
	var title = query.call(doc, "title");
	if (title.length > 0) {
	    return title[0].text;
	}

	return url;
    };

    var scrapeNode = function(doc, originURL, callback) {
	var children = [],
	    errors = [],
	    requestedChildren = [],
	    dependence = null,
	    success = null,
	    failure = null,
	    query = doc.getElementsByTagName ? doc.getElementsByTagName : doc.querySelectorAll;

	var finished = function() {
	    var node = nodes.create(parseTitle(doc, query))
		    .url(originURL);

	    children.forEach(function(child){
		node.edgeTo(child.node)
		    .necessity(child.necessity)
		    .sufficiency(child.sufficiency);
	    });

	    if (dependence) {
		node.dependence(dependence);
	    }

	    if (success && failure) {
		node.localEvidence([failure, success]);
	    }
	    
	    callback(node);
	};

	var maybeFinished = function() {
	    if (children.length + errors.length === requestedChildren.length) {
		finished();
	    }
	};

	Array.prototype.forEach.call(query.call(doc, "table"), function(table){
	    [
		{columns: ["evidence", "necessity", "sufficiency"], f: function(data){ 
		    var a = data.get("evidence").getElementsByTagName("a")[0],
			result = {
			    sufficiency: num(data.get("sufficiency")),
			    necessity: num(data.get("necessity")),
			    evidence: a.getAttribute("href")
			};
		
		    requestedChildren.push(result);
		}},

		{columns: ["dependence"], f: function(data){
		    dependence = num(data.get("dependence"));
		}},

		{columns: ["success", "failure"], f: function(data){
		    success = num(data.get("success"));
		    failure = num(data.get("failure"));
		}}

	    ].forEach(function(tableType){
		var columnNumbers = identifyColumns(table, tableType.columns);
		if (columnNumbers) {
		    Array.prototype.forEach.call(table.getElementsByTagName("tr"), function(row){
			var extracted = getRelevantCells(row, columnNumbers);
			if (extracted) {
			    try {
				tableType.f(extracted);
			    } catch (err) {
				console.error("Error reading table row.");
				console.error(err);
			    }
			} else {
			    // the row wasn't of the right type
			}
		    });
		}
	    });

	    requestedChildren.forEach(function(c){
		var url = isAbsolute(c.evidence) ? c.evidence : originURL + "/../" + c.evidence;
		d3.html(url, function(error, html){
		    if (error) {
			console.log("Failed to scrape page " + url + " " + error);
			errors.push(c);
			maybeFinished();
		    } else {
			scrapeNode(html, url, function(node){
			    c.node = node;
			    children.push(c);
			    maybeFinished();
			});
		    }
		});
	    });
	    /* If we have no children, this will be ready now. */
	    maybeFinished();
	});
    };

    var scrapeRoot = function(doc, originURL, callback) {
	nodes.reset();
	scrapeNode(doc, originURL, function(node){
	    nodes.root(node);
	    callback();
	});
    };

    var module = {
	/*
	 Builds a Process Model by scraping HTML pages.
	 Given an initial page, will look for tables.
	 If it finds a table with the columns evidence, necessity and sufficiency, it will attempt to treat each row in that table as a source of evidence.

	 Child nodes table:
	 evidence: an anchor tag with an href
	 necessity: a number between 0 and 1
	 sufficiency a number between 0 and 1

	 Dependence table:
	 dependence: a number between 0 and 1

	 Evidence table (for leaf nodes only):
	 success: a number between 0 and 1
	 failure: a number between 0 and 1
	 */
	scrape : function(url, callback) {
	    d3.html(url, function(error, html){
		if (error) {
		    throw error.statusText;
		}
		
		scrapeRoot(html, url, callback);
	    });

	},
	scrapeCurrent: function(callback) {
	    scrapeRoot(document, window.location.href, callback);
	}
	
    };
    return module;
};
