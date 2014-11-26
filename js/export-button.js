"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("./helpers.js"),
    noop = helpers.noop,
    callbacks = helpers.callbackHandler;

module.exports = function(getTitle, onTitleChange, serialize, getModel) {
    var exportLinkChanged = callbacks(),
	setDownloadAttr = function(button) {
	    button.attr("download", getTitle() + ".json");	    
	};

    return {
	spec: {
	    text: "Export",
	    element: "a",
	    // We use the default functionality of a link to save a data URL for download.
	    f: noop,
	    onlineOnly: false,
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
	    }
	},

	update: exportLinkChanged
    };
};
