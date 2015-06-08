"use strict";

/*global module, require*/

/*
 Defines what we are currently looking at in the model. In priority order:
  1. Clicked on a node to centre it for editing.
  2. Clicked on a node's focus button to display it and its subtree.
  3. Manually panned or zoomed.
  4. None of the above, or has clicked on the 'Fit' button. In this case we will show the whole model.
 */
module.exports = function() {
    var centredNodeId = null,
	subTreeHead = null,
	manualScale = null,
	manualTranslate = null,

	isCentredOnNode = function() {
	    return centredNodeId !== null;
	},

	hasSubTreeFocus = function() {
	    return centredNodeId === null
		&& subTreeHead !== null;
	},

	hasManualPosition = function() {
	    return centredNodeId === null
		&& subTreeHead === null
		&& manualScale !== null;
	},

	hasWholeModelView = function() {
	    return centredNodeId === null
		&& subTreeHead === null
		&& manualScale === null;
	};
    
    return {
	centreNode: function(nodeId) {
	    centredNodeId = nodeId;
	},

	uncentreNode: function() {
	    centredNodeId = null;
	},

	isCentredOnNode: isCentredOnNode,

	getCentredNodeId: function() {
	    return centredNodeId;
	},
	
	focusSubTree: function(head) {
	    subTreeHead = head;
	    centredNodeId = null;
	},

	hasSubTreeFocus: hasSubTreeFocus,

	getSubTreeFocus: function() {
	    return subTreeHead;
	},

	setManualPosition: function(scale, translate) {
	    centredNodeId = null;
	    subTreeHead = null;
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
	    centredNodeId = null;
	    subTreeHead = null;
	    manualScale = null;
	    manualTranslate = null;
	}
    };
};
