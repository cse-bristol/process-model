"use strict";

/*global module, require*/

var d3 = require("d3"),
    search = require("./search.js"),
    helpers = require("./helpers.js"),
    guid = helpers.guid,
    callbacks = helpers.callbackHandler;

/*
 Provides UI buttons to manage documents.
 */
module.exports = function(container, searchFunction) {
    var title = null,
	temp = false,
	lastSearch = null,
	onNew = callbacks(),
	onOpen = callbacks(),
	onSaveAs = callbacks(),
	onInsert = callbacks(),
	onDelete = callbacks();

    var setTitle = function(newTitle, newTemp) {
	if (temp) {
	    onDelete(title);
	}
	title = newTitle;
	temp = newTemp;
	jsonExport.attr("download", title + ".json");
    };
    
    var withSearch = function(alwaysIncludeSearchText, callback) {
	return function() {
	    if (lastSearch) {
		lastSearch.hide();
	    }
	    lastSearch = search(container, searchFunction, alwaysIncludeSearchText, title, callback);
	};
    };

    var newDoc = function() {
	setTitle(guid(), true);
	onNew(title);
    };

    var open = function(name) {
	setTitle(name, false);
	onOpen(name);
    };
    
    var buttons = d3.map({
	New: newDoc,
	
	Open: withSearch(false, open),
	
	"Save as": withSearch(true, function(result) {
	    setTitle(result, false);
	    onSaveAs(result);
	}),
	
	Insert: withSearch(false, function(result) {
	    onInsert(result);
	}),
	
	Delete: withSearch(false, function(result) {
	    if (result === title) {
		setTitle(guid(), true);
		onNew(title);
	    }		
		onDelete(result);
	})
    });

    container.selectAll("div.document-control-button")
	.data(buttons.keys())
	.enter()
	.append("div")
	.classed("document-control-button", true)
	.text(function(d, i) {
	    return d;
	})
	.on("click", function(d, i) {
	    buttons.get(d)();
	});

    var jsonExport = container.append("a")
	    .classed("document-control-button", true)
	    .text("Export")
	    .attr("href", "javascript:void(0)");

    return {
	newDoc: newDoc,
	onNew: onNew.add,
	open: open,
	onOpen: onOpen.add,
	onSaveAs: onSaveAs.add,
	onInsert: onInsert.add,
	onDelete: onDelete.add,
	updateExportLink: function(val) {
	    jsonExport.attr("href", val);
	}
    };
};
