"use strict";

/*global module, require*/

var d3 = require("d3"),

    defaultNodeWidth = 100,
    defaultNodeHeight = 100,
    horizontalMargin = 5,
    verticalMargin = 15;
    

/*
 Returns a d3 dictionary of size by node id.
 */
module.exports = function(enabledIds, verticalMargins, manualSizes) {
    var result = d3.map(),
	defaultSize = {
	    size: [
		defaultNodeWidth,
		defaultNodeHeight - verticalMargins ? 0 : (2 * verticalMargin)
	    ],
	    margins: {
		horizontal: horizontalMargin,
		vertical: verticalMargins ? verticalMargin : 0
	    }
	};
	
    enabledIds.forEach(function(id) {
	if (manualSizes.has(id)) {
	    var size = manualSizes.get(id);

	    result.set(
		id,
		{
		    size: size,
		    margins: defaultSize.margins
		}
	    );
	    
	} else {
	    result.set(
		id,
		defaultSize
	    );
	}
    });
    
    return result;    
};
