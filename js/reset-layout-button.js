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
		layout.removePosition(id);
	    });
	    
	    layout.size().forEach(function(id, size) {
		layout.removeSize(id);
	    });
	    
	    layout.collapsed().forEach(function(id) {
		layout.expand(id);
	    });

	    refresh();
	},
	{
	}
    );
};
