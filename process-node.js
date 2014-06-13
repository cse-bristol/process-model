"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Nodes = function() {
    var nodes = d3.map({}),
	newNodes = 1;

    var assertNoCycles = function(node) {
	var assertNoCyclesAccum = function(node, seen) {
	    if (seen.indexOf(node.name()) >= 0) {
		throw "Cycle detected";
	    }

	    node.edges().forEach(function(e){
		var copy = seen.slice(0);
		copy.push(node.name());
		assertNoCyclesAccum(e.node(), copy);
	    });
	};
	
	assertNoCyclesAccum(node, []);
    };

    var removeUnreachable = function(root) {
	var findUnreachableAccum = function(node, unreached) {
	    unreached.remove(node.name());
	    node.edges().forEach(function(e){
		findUnreachableAccum(e.node(), unreached);
	    });
	};

	var unreached = d3.set(nodes.keys());
	findUnreachableAccum(root, unreached);
	unreached.forEach(function(n){
	    nodes.remove(n);
	});
    };

    var module = {
	all : function() {
	    return nodes.values();
	},
	get : function(nodeName) {
	    return nodes.get(nodeName);
	},
	create : function(startName) {
	    var localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
		edges = [],
		name = startName ? startName : "new " + newNodes++,
		description = "";
	    
	    var node = {
		localEvidence: function(evidence) {
		    if (evidence) {
			if (edges.length > 0) {
			    throw "Cannot set local evidence on a node which has children";
			}

			if (evidence[0] < 0) {
			    evidence[0] = 0;
			} else if (evidence[0] > 1) {
			    evidence[0] = 1;
			}
			if (evidence[1] < 0) {
			    evidence[1] = 0;
			} else if (evidence[1] > 1) {
			    evidence[1] = 1;
			}
			if (evidence[0] > evidence[1]) {
			    var mid = (evidence[0] + evidence[1]) / 2;
			    evidence[0] = mid;
			    evidence[1] = mid;
			}

			localE = evidence;
			return node;
		    }
		    return localE;
		},
		edges: function() {
		    return edges;
		},
		addEdge: function(to) {
		    var edge = ProcessModel.Edge(node, to);

		    var joinedNodes = edges.map(function(e){
			return e.node();
		    });

		    if (joinedNodes.indexOf(edge.node()) >= 0) {
			return node; // This connection already exists.
		    }

		    edges.push(edge);
		    try {
			assertNoCycles(edge.node());
		    } catch (err) {
			edges.splice(edges.indexOf(edge), 1);
			throw err;
		    }
		    return node;
		},
		removeEdge : function(edge, rootNode) {
		    edges.splice(edges.indexOf(edge), 1);
		    removeUnreachable(rootNode);
		},
		edgeTo : function(node) {
		    var edgeTo;

		    edges.forEach(function(e){
			if (e.node() === node) {
			    edgeTo = e;
			}
		    });

		    if(!edgeTo) {
			throw "Could not find an edge leading to node " + node;
		    }

		    return edgeTo;
		},
		p: function() {
		    if (edges.length === 0) {
			return localE;
		    } else {
			// TODO: the maths
			return [0.0, 1.0];
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
		description: function(d) {
		    if (d) {
			description = d;
			return node;
		    }
		    return description;
		}
	    };

	    nodes.set(node.name(), node);
	    return node;
	}
    };
    return module;
};

ProcessModel.Edge = function(from, to) {
    var necessity = 0.5,
	sufficiency = 0.5;

    var edge = {
	necessity : function(n) {
	    if (n) {
		necessity = Math.min(1, Math.max(n, 0));
		return edge;
	    }
	    return necessity;
	},
	sufficiency : function(s) {
	    if (s) {
		sufficiency = Math.min(1, Math.max(s, 0));
		return edge;
	    }
	    return sufficiency;
	},
	node: function() {
	    return to;
	},
	/* Removes the edge. Tests if any nodes are now unreachable from the root node, and removes them too. */
	disconnect: function(rootNode) {
	    from.removeEdge(edge, rootNode);
	}
    };
    return edge;
};
