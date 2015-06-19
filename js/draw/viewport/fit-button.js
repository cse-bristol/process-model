"use strict";

/*global module, require*/

/*
 A button which will adjust the pan and zoom such that every node in the model is on the screen at once.
 */
module.exports = function(makeToggle, hasWholeModelView, setWholeModelView, clearWholeModelView) {
    return makeToggle(
	"Fit",
	function() {
	    return hasWholeModelView();
	},
	function() {
	    setWholeModelView();
	},
	{},
	function() {
	    clearWholeModelView();
	},
	{}
    );
};
