"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

/*
 Allows us to temporarily switch off transitions. This is useful, for example, when a user is dragging nodes around.
 */
ProcessModel.Transition = function(){
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
	    module.maybeTransition(selection.exit())
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
