"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(update, toolbar) {
    // Default to showing details if we are standalone, and not if we are in an iframe.
    var enabled = window === window.parent;

    toolbar.append("div")
	.attr("id", "margins-toggle")
    	.classed("toolbar-button", true)
	.text("Margins")
	.classed("enabled", enabled)
	.on("click", function(d, i) {
	    enabled = !enabled;
	    d3.select(this)
		.classed("enabled", enabled);
	    
	    update();
	});
    
    return {
	enabled: function() {
	    return enabled;
	}
    };
};
