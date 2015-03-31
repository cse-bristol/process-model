"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    directions = ["LR", "TB", "RL", "BT"],
    directionCoords = d3.map({
	"LR": [1, 0],
	"TB": [0, 1],
	"RL": [-1, 0],
	"BT": [0, -1]
    }),
    minWidth = 50,
    minHeight = 50;

/*
 Contains information about the position, size and collapsed status of nodes in the current document.

 Has a 1-to-1 relationship with a node-collection.
 */
module.exports = function(nodes) {
    var collapsedNodes = d3.set(),
	manualPositions = d3.map(),
	manualSizes = d3.map(),
	orientation = directions[0],
	
	onSetSize = callbacks(),
	onSetPosition = callbacks(),
	onSetCollapsed = callbacks(),
	onSetOrientation = callbacks();

    nodes.onNodeChooseType(function(old, replacement) {
	/*
	 When we choose a node's type, we remove it and put in a new node with a new id.
	 
	 This code ensures that any layout applied to the old node is transferred.
	 */
	if (collapsedNodes.has(old.id)) {
	    m.setCollapsed(replacement.id, true);
	}

	if (manualPositions.has(old.id)) {
	    m.setPosition(replacement.id, m.getPosition(old.id));
	}

	if (manualSizes.has(old.id)) {
	    m.setPosition(replacement.id, m.getPosition(old.id));
	}
    });

    nodes.onNodeDelete(function(id) {
	m.setCollapsed(id, false);
	m.setPosition(id, null);
	m.setSize(id, null);
    });

    var m = {
	setPosition: function(id, position) {
	    manualPositions.set(id, position);
	    onSetPosition(id, position);
	},
	getPosition: function(id) {
	    return manualPositions.get(id);
	},
	onSetPosition: onSetPosition.add,
	position: function() {
	    return manualPositions;
	},
	
	setCollapsed: function(id, collapsed) {
	    if (collapsed) {
		collapsedNodes.add(id);
	    } else {
		collapsedNodes.remove(id);
	    }

	    onSetCollapsed(id, collapsed);
	},
	isCollapsed: function(id) {
	    return collapsedNodes.has(id);
	},
	onSetCollapsed: onSetCollapsed.add,
	collapsed: function() {
	    return collapsedNodes;
	},
	
	setSize: function(id, size) {
	    if (size) {
		/*
		 If we're not clearing the size entirely, ensurely that it's not too small that we'll be stuck.
		 */
		size = [
		    size[0] < minWidth ? minWidth : size[0],
		    size[1] < minHeight ? minHeight : size[1]
		];
	    }
	    
	    manualSizes.set(id, size);
	    onSetSize(id, size);
	},
	getSize: function(id) {
	    return manualSizes.get(id);
	},
	onSetSize: onSetSize.add,
	size: function() {
	    return manualSizes;
	},

	setOrientation: function(val) {
	    orientation = val;
	    onSetOrientation(orientation);
	},
	toggleOrientation: function() {
	    m.setOrientation(
		directions[(directions.indexOf(orientation) + 1) % directions.length]
	    );
	},
	getOrientation: function() {
	    return orientation;
	},
	/*
	 Unit vector in the direction specified.
	 */
	getOrientationCoords: function() {
	    return directionCoords.get(orientation).slice(0);
	},
	onSetOrientation: onSetOrientation.add,
	
	/*
	 Take all the data from the passed in layout and add it to this layout.
	 */
	merge: function(layout) {
	    layout.position().forEach(function(id, position) {
		module.position(id, position);
	    });
	    layout.collapsed().forEach(function(id) {
		module.collapsed(id);
	    });
	    layout.size().forEach(function(id, position) {
		module.size(id, position);
	    });
	}	
    };

    return m;    
};
