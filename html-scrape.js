"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

// result.evidence = JSON.parse(evidenceCell.innerHtml);

ProcessModel.Scrape = function(nodes){
    var columns = ["evidence", "necessity", "sufficiency"];

    var num = function(el) {
	return parseFloat(el.childNodes[0].data);
    };

    var identifyColumns = function(table) {
	var th = table.getElementsByTagName("th"),
	    columnNumbers = d3.map(),
	    i = 0;

	Array.prototype.forEach.call(th, function(header){
	    var text = header.innerHTML;

	    if (columns.indexOf(text) >= 0) {
		columnNumbers.set(text, i);
	    }
	    i++;
	});

	if (columnNumbers.values().length === 3) {
	    return columnNumbers;
	}
	return null;
    };

    var parseRow = function(row, columnNumbers) {
	var cells = row.getElementsByTagName("td");

	if (cells.length === 0) {
	    return null; // This is probably a header row.
	}

	try {
	    var evidenceCell = cells[(columnNumbers.get("evidence"))],
		a = evidenceCell.getElementsByTagName("a"),
		result = {
		sufficiency: num(cells[columnNumbers.get("sufficiency")]),
		necessity: num(cells[columnNumbers.get("necessity")])
	    };

	    if (a.length > 0) {
		result.evidence = a[0].href;
	    } else {
		console.log("Not a valid row " + row.html);
		return null;
	    }
	    return result;

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

    var scrapeNode = function(doc, callback) {
	var children = [],
	    errors = [],
	    requestedChildren = [],
	    query = doc.getElementsByTagName ? doc.getElementsByTagName : doc.querySelectorAll;

	var finished = function() {
	    var node = nodes.create(parseTitle(doc, query));

	    // TODO title

	    children.forEach(function(child){
		node.edgeTo(child.node)
		    .necessity(child.necessity)
		    .sufficiency(child.sufficiency);
	    });
	    
	    callback(node);
	};

	var maybeFinished = function() {
	    if (children.length + errors.length === requestedChildren.length) {
		finished();
	    }
	};

	// TODO: Dependence
	// TODO: Local evidence

	Array.prototype.forEach.call(query.call(doc, "table"), function(table){
	    var columnNumbers = identifyColumns(table);

	    if (!columnNumbers) {
		return; // Not the table we're looking for.
	    }

	    Array.prototype.forEach.call(table.getElementsByTagName("tr"), function(row){
		var parsed = parseRow(row, columnNumbers);
		if (!parsed) {
		    return; // This row had something we didn't understand in it.
		}
		
		requestedChildren.push(parsed);
	    });

	    requestedChildren.forEach(function(c){
		d3.html(c.evidence, function(error, html){
		    if (error) {
			console.log("Failed to scrape page " + c.evidence + " " + error);
			errors.push(c);
		    }

		    scrapeNode(html, function(node){
			c.node = node;
			children.push(c);
			maybeFinished();
		    });
		});
	    });
	    /* If we have no children, this will be ready now. */
	    maybeFinished();
	});
    };

    var scrapeRoot = function(doc, callback) {
	nodes.reset();
	scrapeNode(doc, function(node){
	    nodes.root(node);
	    callback();
	});
    };

    var module = {
	/*
	 Builds a Process Model by scraping HTML pages.
	 Given an initial page, will look for tables.
	 If it finds a table with the columns evidence, necessity and sufficiency, it will attempt to treat each row in that table as a source of evidence.

	 evidence: an anchor tag with an href OR an interval probability like [0, 1].
	 necessity: a number between 0 and 1
	 sufficiency a number between 0 and 1

	 TODO: it should also get dependence from somewhere.
	 */
	scrape : function(url, callback) {
	    d3.html(url, function(error, html){
		if (error) {
		    throw error.statusText;
		}
		
		scrapeRoot(html, callback);
	    });

	},
	scrapeCurrent: function(callback) {
	    scrapeRoot(document, callback);
	}
	
    };
    return module;
};
