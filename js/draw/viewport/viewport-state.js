"use strict";

/*global module, require*/

var centred = "centred",
    subtree = "subtree",
    fit = "fit",
    manual = "manual",

    modes = [centred, subtree, fit, manual];

/*
 Defines what we are currently looking at in the model.

 Default (and fallback for potential failures) to 'fit whole model to screen' mode, since we require no data to do this.
 */
module.exports = function() {
    var mode = "fit",
	previousMode = null,

	changeMode = function(newMode) {
	    if (mode !== newMode) {
		if (mode !== centred) {
		    // We never want to revert to centred.
		    previousMode = mode;
		}
		
		mode = newMode;
	    }
	},

	revertMode = function() {
	    if (previousMode) {
		var swap = previousMode;

		if (mode !== centred) {
		    // We never want to revert to centred.		    
		    previousMode = mode;
		}
		mode = swap;

	    } else {
		mode = fit;
	    }
	},

	subtreeHeadId = null,
	centredNodeId = null,

	manualScale = 1,
	manualTranslate = [0, 0],

	isCentredOnNode = function() {
	    return mode === centred;
	},

	hasSubTreeFocus = function() {
	    return mode === subtree;
	},

	hasWholeModelView = function() {
	    return mode === fit;
	},

	hasManualPosition = function() {
	    return mode === manual;
	};	
    
    return {
	centreNode: function(id) {
	    changeMode(centred);
	    centredNodeId = id;
	},

	clearCentreAndFocus: function() {
	    if (mode === centred || mode === subtree) {
		revertMode();
	    }
	},

	isCentredOnNode: isCentredOnNode,

	getCentredNodeId: function() {
	    return centredNodeId;
	},
	
	focusSubTree: function(head) {
	    changeMode(subtree);
	    subtreeHeadId = head;
	},

	hasSubTreeFocus: hasSubTreeFocus,

	getSubTreeFocus: function() {
	    return subtreeHeadId;
	},

	setManualPosition: function(scale, translate) {
	    changeMode(manual);

	    manualScale = scale;
	    manualTranslate = translate;
	},

	hasManualPosition: hasManualPosition,

	getManualScale: function() {
	    return manualScale;
	},

	getManualTranslate: function() {
	    return manualTranslate;
	},

	hasWholeModelView: hasWholeModelView,

	setWholeModelView: function() {
	    changeMode(fit);
	},

	clearWholeModelView: function() {
	    if (mode === fit) {
		revertMode();

		if (mode === fit) {
		    changeMode(manual);
		}
	    }		     
	}
    };
};
