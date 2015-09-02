"use strict";

/*global module, require*/

/*
 A button to work with the multiuser-file-menu library.

 When clicked on, it will clear all manual layout (sizing, positions and collapsed/uncollapsed status).
 */
module.exports = function(toolbar, getLayout, refresh) {
    toolbar.append("div")
    	.classed("toolbar-button", true)
	.attr("id", "tidy-button")
	.text("Tidy")
	.on("click", function() {
	    var layout = getLayout();
	    
	    layout.position().forEach(function(id, position) {
		layout.setPosition(id, null);
	    });
	    
	    layout.size().forEach(function(id, size) {
		layout.setSize(id, null);
	    });
	    
	    layout.setDepth(null);

	    refresh();
	});
};
