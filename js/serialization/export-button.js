"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    noop = helpers.noop,
    callbacks = helpers.callbackHandler;

module.exports = function(getTitle, onTitleChange, serialize, getModel, makeButton) {
    var exportLinkChanged = callbacks(),
	setDownloadAttr = function(button) {
	    var title = getTitle();
	    
	    button.attr("download", title ? title : "untitled process-model" + ".json");	    
	};

    return {
	spec: makeButton(
	    "Export",
	    // We use the default functionality of a link to save a data URL for download.	    
	    noop,
	    {
		element: "a",
		hooks: function(button) {
		    setDownloadAttr(button);
		    
		    onTitleChange(function(newTitle) {
			setDownloadAttr(button);
		    });
		    
		    exportLinkChanged.add(function() {
			button.attr("href", "data:application/json,"
				    + encodeURIComponent(
					JSON.stringify(
					    serialize(getModel())
					)
				    ));
		    });

		    /*
		     This is really a link disguised as a button, so we don't want the confirmation check mark.
		     */
		    button.select(".confirmation").remove();
		}
	    }),
	
	update: exportLinkChanged
    };
};
