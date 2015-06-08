"use strict";

/*global module, require*/

module.exports = function(update) {
    // Default to showing details if we are standalone, and not if we are in an iframe.
    var enabled = window === window.parent;

    return {
	enabled: function() {
	    return enabled;
	},
	
	makeButtons: function(makeToggle) {
	    return makeToggle(
		"Detail",
		function() {
		    return enabled;
		},
		function() {
		    enabled = true;
		    update();
		},
		{},
		function() {
		    enabled = false;
		    update();
		},
		{}
	    );
	}
    };
};
