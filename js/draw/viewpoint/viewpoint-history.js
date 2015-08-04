"use strict";

/*global module, require*/

var state = require("../../state/viewpoint-state.js"),
    modes = state.modes,
    createState = state.create;

/*
 Wraps the viewpoint state.

 Provides the option to switch to a past state.
 */
module.exports = function() {
    var states,

	reset = function() {
	    states = [
		createState(modes.manual),
		createState(modes.fit)
	    ];
	},

	currentState = function() {
	    return states[states.length - 1] || null;
	},

	currentMode = function() {
	    return currentState() && currentState().mode;
	},

        changeMode = function(newMode) {
	    if (currentMode() !== newMode) {
		if (currentMode() === modes.centred) {
		    // We never want to revert to centred.
		    states.pop();
		}

		states.push(createState(newMode));
	    }
	},

	revertMode = function() {
	    if (states.length !== 0) {
		states.pop();
	    }
	},

	hasMode = function(mode) {
	    return function() {
		return currentMode() === mode;
	    };
	},

	hasCentredNode = hasMode(modes.centred),
	hasSubtreeFocus = hasMode(modes.subtree),
	hasManualPosition = hasMode(modes.manual),
	hasWholeModelView = hasMode(modes.fit);

    reset();

    return {
	reset: reset,
	
	pushSavedState: function(state) {
	    if (state) {
		states.push(state);
	    }
	},

	getCurrentState: currentState,
	
	clearCentreAndFocus: function() {
	    if (hasCentredNode() || hasSubtreeFocus()) {
		revertMode();
	    }
	},

	clearWholeModelView: function() {
	    if (hasWholeModelView()) {
		revertMode();
	    }		     
	},	
	
	centreNode: function(id) {
	    changeMode(modes.centred);
	    currentState().setNodeId(id);
	},

	isCentredOnNode: hasCentredNode,

	getCentredNodeId: function() {
	    return (hasCentredNode() && currentState().getNodeId()) || null;
	},
	
	focusSubTree: function(nodeId) {
	    changeMode(modes.subtree);
	    currentState().setNodeId(nodeId);
	},

	hasSubTreeFocus: hasSubtreeFocus,

	getSubTreeFocus: function() {
	    return (hasSubtreeFocus() && currentState().getNodeId()) || null;
	},

	setManualPosition: function(scale, translate) {
	    changeMode(modes.manual);
	    currentState().setScale(scale);
	    currentState().setTranslate(translate);
	},

	hasManualPosition: hasManualPosition,

	getManualScale: function() {
	    return (hasManualPosition() && currentState().getScale()) || null;
	},

	getManualTranslate: function() {
	    return (hasManualPosition() && currentState().getTranslate()) || null;
	},

	hasWholeModelView: hasWholeModelView,

	setWholeModelView: function() {
	    changeMode(modes.fit);
	}
    };
};
