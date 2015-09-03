"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 A button which will adjust the pan and zoom such that every node in the model is on the screen at once.
 */
module.exports = function(toolbar, hasWholeModelView, setWholeModelView, clearWholeModelView) {
    var button = toolbar.append("div")
	    .classed("toolbar-button", true)
	    .attr("id", "fit-button")
	    .text("Fit")
	    .on("click", function() {
		if (button.classed("enabled")) {
		    clearWholeModelView();
		} else {
		    setWholeModelView();
		}
	    });

    var update  = function() {
	button.classed("enabled", hasWholeModelView());
    };

    update();

    return {
	update: update
    };
};
