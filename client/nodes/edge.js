"use strict";

/*global module, require*/

/*
 A function which creates an edge between two nodes.

 onDisconnect and onNavigate are callback handlers.
 */
module.exports = function(from, to, onNavigate) {
    if (!(to.type === 'undecided' || from.allowedChildren.has(to.type))) {
	throw new Error("Cannot connect node of type " + from.type + " to node of type " + to.type);
    }

    var edge = {
	node: function() {
	    return to;
	},
	
	parent: function() {
	    return from;
	},
	
	/* Removes the edge. Tests if any nodes are now unreachable from the root node, and removes them too. */
	disconnect: function() {
	    from.removeEdge(edge);
	},
	
	nextEdge: function(edge) {
	    var choices = edge.parent().edges(),
		i = choices.indexOf(edge);
	    
	    return choices[(i+1) % choices.length];
	},

	previousEdge: function(edge) {
	    var choices = edge.parent().edges(),
		i = choices.indexOf(edge),
		nextI = i == 0 ? choices.length - 1 : i - 1;

	    return choices[nextI];
	},

	keys:  [
	    {
		key: "del",
		description: "disconnect this edge",
		action: function() {
		    edge.disconnect();
		}
	    },
	    {
		key: "left",
		description: "navigate to the parent node",
		action: function() {
		    onNavigate(edge.parent());
		}
	    },
	    {
		key: "right",
		description: "navigate to the child node",
		action: function() {
		    onNavigate(edge.node());
		}
	    },
	    {
		key: "up",
		description: "navigate to the previous edge which comes from the same parent",
		action: function() {
		    onNavigate(edge.previousEdge());
		}
	    },
	    {
		key: "down",
		description: "navigate to the next edge which comes from the same parent",
		action: function() {
		    onNavigate(edge.nextEdge());
		}
	    }
	]

    };

    to.extendIncomingEdge(edge);
    return edge;
};
