"use strict";

/*global module, require*/

/*
 A button to work with the multiuser-file-menu library.

 When clicked on, it will clear all manual layout (sizing, positions and collapsed/uncollapsed status).
 */
module.exports = function(makeButton, getLayout, refresh) {
    return makeButton(
	"Layout",
	function(name) {
	    var layout = getLayout();
	    
	    layout.position().forEach(function(id, position) {
		layout.setPosition(id, null);
	    });
	    
	    layout.size().forEach(function(id, size) {
		layout.setSize(id, null);
	    });
	    
	    layout.collapsed().forEach(function(id) {
		layout.setCollapsed(id, false);
	    });

	    refresh();
	},
	{
	}
    );
};
