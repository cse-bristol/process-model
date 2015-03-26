"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    directions = ["LR", "TB", "RL", "BT"];

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
	    collapsedNodes.remove(old.id);
	    collapsedNodes.add(replacement.id);
	}

	if (manualPositions.has(old.id)) {
	    manualPositions.set(
		replacement.id,
		manualPositions.get(old.id)
	    );

	    manualPositions.remove(old.id);
	}

	if (manualSizes.has(old.id)) {
	    manualSizes.set(
		replacement.id,
		manualSizes.get(old.id)
	    );

	    manualSizes.remove(old.id);
	}
    });

    nodes.onNodeDelete(function(n) {
	m.setCollapsed(n.id, false);
	m.setPosition(n.id, null);
	m.setSize(n.id, null);
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
		(directions.indexOf(orientation) + 1) % directions.length
	    );
	},
	getOrientation: function() {
	    return orientation;
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
