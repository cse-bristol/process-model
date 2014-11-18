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
    var documentName = null,
	temp = false,
	onNew = callbacks(),
	onOpen = callbacks(),
	onSaveAs = callbacks(),
	onInsert = callbacks(),
	onDelete = callbacks();
    
    var withSearch = function(alwaysIncludeSearchText, callback) {
	// TODO decide where to put the search box.
	return function() {
	    search(container, searchFunction, alwaysIncludeSearchText, callback);
	};
    };

    var clearTempDocument = function() {
	if (temp) {
	    onDelete(documentName);
	}
    };

    var newDoc = function() {
	clearTempDocument();
	    
	temp = true;
	documentName = guid();
	onNew(documentName);
    };

    var open = function(name) {
	clearTempDocument();

	temp = false;
	documentName = name;
	onOpen(name);
    };
    
    var buttons = d3.map({
	New: newDoc,
	
	Open: withSearch(false, open),
	
	"Save as": withSearch(true, function(result) {
	    clearTempDocument();

	    temp = false;
	    documentName = result;
	    onSaveAs(result);
	}),
	
	Insert: withSearch(false, function(result) {
	    onInsert(result);
	}),
	
	Delete: withSearch(false, function(result) {
	    if (result === documentName) {
		temp = true;
		documentName = guid();
		onNew(documentName);
		
		onDelete(result);
		
	    } else {
		onDelete(result);
	    }
	})
    });

    container.selectAll("div")
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

    return {
	newDoc: newDoc,
	onNew: onNew.add,
	open: open,
	onOpen: onOpen.add,
	onSaveAs: onSaveAs.add,
	onInsert: onInsert.add,
	onDelete: onDelete.add
    };
};
