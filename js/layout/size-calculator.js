"use strict";

/*global module, require*/

var d3 = require("d3"),

    defaultNodeWidth = 100,
    defaultNodeHeight = 100,
    horizontalMargin = 5,
    bottomMargin = 20,
    topMargin = 5;
    

/*
 Returns a d3 dictionary of size by node id.
 */
module.exports = function(enabledIds, bottomMargins, centredNodeId, manualSizes) {
    var result = d3.map(),
	
	defaultSize = [
	    defaultNodeWidth,
	    defaultNodeHeight
	],
	
	defaultMargins = {
	    horizontal: horizontalMargin,
	    top: topMargin,
	    bottom: bottomMargins ? bottomMargin : 0
	},

	lookup = function(id) {
	    if (id === centredNodeId) {
		return [
		    window.innerWidth / 4,
		    window.innerHeight / 4
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
