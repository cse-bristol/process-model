"use strict";

/*global module*/

/*
 Allows us to temporarily switch off transitions. This is useful, for example, when a user is dragging nodes around.
 */
module.exports = function(){
    var enabled = true;

    var module = {
	maybeTransition: function(selection) {
	    if (enabled) {
		return selection.transition();		
	    } else {
		return selection;
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
	enabled: function(val) {
	    if (val === undefined) {
		return enabled;
	    } else {
		enabled = val;
		return module;
	    }
	}
    };
    return module;
};
