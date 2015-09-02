"use strict";

/*global module, require*/

module.exports = function(toolbar, zoom, update) {
    toolbar.append("div")
	.attr("id", "zoom-in-button")
    	.classed("toolbar-button", true)
	.text("+")
	.on("click", function() {
	    zoom.in();
	});

    toolbar.append("div")
	.attr("id", "zoom-out-button")
    	.classed("toolbar-button", true)
	.text("-")
	.on("click", function() {
	    zoom.out();
	});
};
