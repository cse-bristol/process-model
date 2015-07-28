"use strict";

/*global module, require*/

module.exports = function(toolbar, getLayoutState, update) {
    var button = toolbar.append("div")
	.attr("id", "rotate-button")
	.text("Rotate")
	.on("click", function() {
	    getLayoutState()
		.toggleOrientation();

	    update();
	});

    var redraw = function() {
	var layout = getLayoutState();

	if (layout) {
	    var currentDirection = layout.getOrientation();

	    layout.possibleOrientations.forEach(function(direction) {
		button.classed(direction, direction === currentDirection);
	    });
	}
    };

    redraw();
    
    return {
	update: redraw
    };
};
