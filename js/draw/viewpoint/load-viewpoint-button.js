"use strict";

/*global module, require*/

module.exports = function(toolbar, getSavedViewpoint, pushViewpointState, onViewpointSaved, update) {
    var button = toolbar.append("div")
	    .attr("id", "load-viewpoint-button")
	    .text("Load Viewpoint")
	    .on("click", function() {
		var v = getSavedViewpoint();
		if (v) {
		    pushViewpointState(v);
		    update();
		}
	    }),

	savedIndicatorWrapper = button.append("div")
	    .attr("id", "viewpoint-saved-indicator-wrapper"),

	savedIndicator = savedIndicatorWrapper.append("div")
	    .text("Viewpoint saved"),

	redraw = function() {
	    button.classed("enabled", function() {
		return getSavedViewpoint() !== null;
	    });
	};

    redraw();
    onViewpointSaved(function() {
	redraw();
	savedIndicator
	    .classed("enabled", true);

	window.setTimeout(
	    function() {
		savedIndicator.classed("enabled", false);
	    },
	    10
	);
    });

    return {
	update: redraw
    };
};
