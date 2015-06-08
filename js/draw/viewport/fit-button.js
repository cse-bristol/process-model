"use strict";

/*global module, require*/

/*
 A button which will adjust the pan and zoom such that every node in the model is on the screen at once.
 */
module.exports = function(makeButton, setWholeModelView) {
    return makeButton(
	"Fit",
	function() {
	    setWholeModelView();
	},
	{
	}
    );
};
