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
module.exports = function(enabledIds, verticalMargins, centredNodeId, manualSizes) {
    var result = d3.map(),
	
	defaultSize = [
	    defaultNodeWidth,
	    defaultNodeHeight - (verticalMargins ? 0 : (2 * verticalMargin))
	],
	
	defaultMargins = {
	    horizontal: horizontalMargin,
	    vertical: verticalMargins ? verticalMargin : 0
	},

	lookup = function(id) {
	    if (id === centredNodeId) {
		return [
		    window.innerWidth / 6,
		    window.innerHeight / 6
		];
	    } else if (manualSizes.has(id)) {
		return manualSizes.get(id);
	    } else {
		return defaultSize;
	    }
	};
	    
    enabledIds.forEach(function(id) {
	result.set(
	    id,
	    {
		margins: defaultMargins,
		size: lookup(id)
	    }
	);
    });
    
    return result;    
};
