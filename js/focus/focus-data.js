"use strict";

/*global module, require*/

module.exports = function() {
    var selectedNodeId = null,
	manualControl = false;


    return {
	getSelectedNodeId: function() {
	    return selectedNodeId;
	},

	hasSelectedNodeId: function() {
	    return selectedNodeId !== null;
	},

	setSelectedNodeId: function(val) {
	    selectedNodeId = val;
	    manualControl = false;
	},

	setManualControl: function() {
	    manualControl = true;
	},

	underManualControl: function() {
	    return manualControl;
	},

	clear: function() {
	    selectedNodeId = null;
	    manualControl = false;
	}
    };
};
