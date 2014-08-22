"use strict";

/*global module, require*/

var d3 = require("d3"),
    types = require("./process-node.js");

var nextEdge = function(edge) {
    var choices = edge.parent().edges(),
	i = choices.indexOf(edge);
    
    return choices[(i+1) % choices.length];
};

var previousEdge = function(edge) {
    var choices = edge.parent().edges(),
	i = choices.indexOf(edge),
	nextI = i == 0 ? choices.length - 1 : i - 1;

    return choices[nextI];
};

module.exports = function() {
    var nodes, newNodes, root,
	onCreate = [],
	onRoot = [],
	onDelete,
	onNavigate;

    var assertNoCycles = function(node) {
	var assertNoCyclesAccum = function(node, seen, edge) {
	    if (seen.indexOf(node.name()) >= 0) {
		throw new Error("Cycle detected for node " + node.name() + " from " + edge.parent().name());
	    }

	    node.edges().forEach(function(e){
		var copy = seen.slice(0);
		copy.push(node.name());
		assertNoCyclesAccum(e.node(), copy, e);
	    });
	};
	
	assertNoCyclesAccum(node, []);
    };

    var removeUnreachable = function() {
	var findUnreachableAccum = function(node, unreached) {
	    unreached.remove(node.name());
	    node.edges().forEach(function(e){
		findUnreachableAccum(e.node(), unreached);
	    });
	};

	var unreached = d3.set(nodes.keys());
	findUnreachableAccum(root, unreached);
	unreached.forEach(function(n) {
	    onDelete("node", n);
	    nodes.get(n).edges().forEach(function(e) {
		onDelete("edge", e);
	    });
	    nodes.remove(n);
	});
    };

    var edgesToNode = function(node) {
	var edges = [],
	    stack = [root],
	    seen = d3.set();

	while (stack.length > 0) {
	    var current = stack.pop();
	    if (!seen.has(current.name())) {
		seen.add(current.name());
		current.edges().forEach(function(e){
		    if (e.node() === node) {
			edges.push(e);
		    } else {
			stack.push(e.node());
		    }
		});
	    }
	}

	return edges;
    };

    var nodeContainer = {
	all : function() {
	    return nodes.values();
	},
	has: function(nodeName) {
	    return nodes.has(nodeName);
	},
	get : function(nodeName) {
	    return nodes.get(nodeName);
	},
	reset: function() {
	    nodes = d3.map({});
	    newNodes = 1;
	    root = null;
	},
	onNavigate: function(callback) {
	    onNavigate = callback;
	},
	onRoot: function(callback) {
	    onRoot.push(callback);
	},
	root: function(newRoot) {
	    if (newRoot !== undefined) {
		root = newRoot;
		return this;

		onRoot.forEach(function(callback) {
		    callback(root);
		});
	    }
	    return root;
	},
	onDelete: function(callback) {
	    onDelete = callback;
	},
	onCreate: function(callback) {
	    onCreate.push(callback);
	},
	create : function(type, startName) {
	    if (nodes.has(startName)) {
		throw new Error("Tried to create a node that already exists " + startName);
	    }

	    if (!types.has(type)) {
		throw new Error("Unknown type of node " + type);
	    }

	    var edges = [],
		description = "Write about this node here.",
		name = startName;

	    while (!name || nodes.has(name)) {
		name = "new " + newNodes++;
	    }

	    var node = {
		type: type,
		childTypes: function() {
		    throw new Error("Child types was not implemented for node of type " + type);
		},
		incomingEdges: function() {
		    return edgesToNode(node);
		},
		extendIncomingEdge: function(edge) {
		    return edge;
		},
		isLeaf : function() {
		    return edges.length === 0;
		},
		edges: function() {
		    return edges;
		},
		removeEdge : function(edge) {
		    onDelete("edge", edge);
		    edges.splice(edges.indexOf(edge), 1);
		    removeUnreachable();
		},
		edgeTo : function(to) {
		    var existingEdge;
		    edges.forEach(function(e){
			if (e.node() === to) {
			    existingEdge = e;
			}
		    });
		    if (existingEdge) {
			return existingEdge;
		    }

		    var edgeTo = nodeContainer.edge(node, to);
		    edges.push(edgeTo);
		    try {
			assertNoCycles(node);
			return edgeTo;
			
		    } catch (err) {
			edges.splice(edges.indexOf(edgeTo), 1);
			throw err;
		    }
		},
		name: function(n) {
		    if (n) {
			if (nodes.has(n)) {
			    throw "Name already taken " + n;
			}

			nodes.remove(name);
			name = n;
			nodes.set(n, node);
			
			return node;
		    }
		    return name;
		},
		description: function(c) {
		    if (c === undefined) {
			return description;
		    } else {
			description = c;
			return this;
		    }
		},
		countDescendents: function() {
		    var seen = [],
			stack = edges.slice(0);

		    while(stack.length > 0) {
			var current = stack.pop().node();
			if (seen.indexOf(current) < 0) {
			    seen.push(current);
			    current.edges().forEach(function(e){
				stack.push(e);
			    });
			}
		    }

		    return seen.length;
		},
		canCollapse: function() {
		    return !node.isLeaf();
		}
	    };

	    node.keys = [
		{
		    key: 'del',
		    description: 'remove an incoming edge',
		    action: function() {
			var e = edgesToNode(node)[0];
			e.parent().removeEdge(e);
		    }
		},
		{
		    key: "right",
		    description: "navigate to first outgoing edge",
		    action: function() {
			onNavigate(node.edges()[0]);
		    }
		},
		{
		    key: "left",
		    description: "navigate to first incoming edge",
		    action: function() {
			onNavigate(edgesToNode(node)[0]);
		    }
		},
		{
		    key: "up",
		    description: "navigate to the previous node which comes from the same parent",
		    action: function() {
			onNavigate(
			    previousEdge(edgesToNode(node)[0])
				.node());
		    }
		},
		{
		    key: "down",
		    description: "navigate to the next node which comes from the same parent",
		    action: function() {
			onNavigate(
			    nextEdge(edgesToNode(node)[0])
				.node());
		    }
		}

	    ];
		

	    if (nodes.empty()) {
		root = node;
	    }
	    nodes.set(node.name(), node);

	    types.get(type)(node, nodeContainer);

	    onCreate.forEach(function(callback) {
		callback(node);
	    });

	    if (!node.allowedChildren.empty()) {
		node.allowedChildren.keys = [{
		    key: 'enter',
		    description: 'create a child node',
		    action: function() {
			var newNode = nodeContainer.create("undecided");
			node.edgeTo(newNode);
		    }
		}];
	    }

	    return node;
	},
	edge: function(from, to) {
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
		}
	    };

	    edge.keys = [
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
			onNavigate(previousEdge(edge));
		    }
		},
		{
		    key: "down",
		    description: "navigate to the next edge which comes from the same parent",
		    action: function() {
			onNavigate(nextEdge(edge));
		    }
		}
	    ];

	    to.extendIncomingEdge(edge);
	    return edge;
	}
    };
    nodeContainer.reset();
    return nodeContainer;
};



