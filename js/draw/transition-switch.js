"use strict";

/*global module*/

/*
 Allows us to temporarily switch off transitions. This is useful, for example, when a user is dragging nodes around.
 */
module.exports = function(){
    var disabled = 0;

    var module = {
	maybeTransition: function(selection) {
	    if (disabled) {
		return selection;
	    } else {
		return selection.transition();		
	    };
	},
	fadeOut: function(selection) {
	    
	    module.maybeTransition(
		selection.exit()
		    .classed("removing", true)
	    )
		.style("opacity", 0.0001)
		.remove();
	},
	disable: function() {
	    disabled++;

	},
	enable: function() {
	    if (disabled > 0) {
		disabled--;
	    }
	},
	enabled: function() {
	    return !disabled;
	}
    };
    return module;
};
