"use strict";

/*global module, require*/

module.exports = function(makeButton, getLayoutState, update) {
    return makeButton(
	"Rotate",
	function(name) {
	    var layout = getLayoutState();

	    layout.toggleOrientation();

	    update();
	},
	{
	}
    );	
};
