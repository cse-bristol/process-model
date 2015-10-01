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
    /*
     Null depth means all nodes are visible. A number indicates that we will cut off some of the nodes which are too deep into the graph.

     Depth is measures as shortest path to the node from a node with no ancestors.

     A node with no ancestors is itself considered to have a depth of 1.
    */
    var depth = null,
	manualPositions = d3.map(),
	manualSizes = d3.map(),
	orientation = directions[0],

	onSetDepth = callbacks(),
	onSetSize = callbacks(),
	onSetPosition = callbacks(),
	onSetOrientation = callbacks();

    nodes.onNodeChooseType(function(old, replacement) {
	/*
	 When we choose a node's type, we remove it and put in a new node with a new id.
	 
	 This code ensures that any layout applied to the old node is transferred.
	 */
	if (manualPositions.has(old.id)) {
	    m.setPosition(replacement.id, m.getPosition(old.id));
	}

	if (manualSizes.has(old.id)) {
	    m.setPosition(replacement.id, m.getPosition(old.id));
	}
    });

    nodes.onNodeDelete(function(id) {
	m.setPosition(id, null);
	m.setSize(id, null);
    });

    var m = {
	setPosition: function(id, position) {
	    if (position) {
		manualPositions.set(id, position);
	    } else {
		manualPositions.remove(id);
	    }
	    onSetPosition(id, position);
	},
	getPosition: function(id) {
	    return manualPositions.get(id);
	},
	onSetPosition: onSetPosition.add,
	position: function() {
	    return manualPositions;
	},
	
	setDepth: function(d) {
	    depth = d;
	    onSetDepth(d);
	},

	depth: function() {
	    return depth;
	},

	onSetDepth: onSetDepth.add,
	
	setSize: function(id, size) {
	    if (size) {
		/*
		 If we're not clearing the size entirely, ensurely that it's not too small that we'll be stuck.
		 */
		size = [
		    size[0] < minWidth ? minWidth : size[0],
		    size[1] < minHeight ? minHeight : size[1]
		];

		manualSizes.set(id, size);
	    } else {
		manualSizes.remove(id);
	    }
	    
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

	possibleOrientations: directions,
	
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
	    if (depth) {
		/*
		 The merged depth will be the deeper of the layouts.
		*/
		var otherDepth = layout.depth();
		if (otherDepth === null) {
		    m.setDepth(null);
		} else {
		    if (otherDepth > depth) {
			m.setDepth(otherDepth);
		    }
		}
	    }
	    
	    layout.position().forEach(function(id, position) {
		m.position(id, position);
	    });
	    layout.size().forEach(function(id, position) {
		m.size(id, position);
	    });
	}	
    };

    return m;    
};
