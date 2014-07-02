"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Nodes = function() {
    var nodes, newNodes, root;

    var clamp = function(min, num, max) {
	return Math.max(min, Math.min(max, num));
    };

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

    var removeUnreachable = function() {
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

    var edgesToNode = function(node) {
	var edges = [],
	    stack = [root];

	while (stack.length > 0) {
	    stack.pop().edges().forEach(function(e){
		if (e.node() === node) {
		    edges.push(e);
		} else {
		    stack.push(e.node());
		}
	    });
	}

	return edges;
    };

    var module = {
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
	root: function(newRoot) {
	    if (newRoot) {
		root = newRoot;
		return this;
	    }
	    return root;
	},
	create : function(startName) {
	    if (nodes.has(startName)) {
		throw "Tried to create a node that already exists " + startName;
	    }

	    var localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
		localDep = 1,
		edges = [],
		url = null,
		name = startName ? startName : "new " + newNodes++;	    
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
		dependence: function(dependence) {
		    if (edges.length === 0) {
			throw "Dependence is not used for leaf nodes.";
		    }

		    if (dependence) {
			localDep = clamp(0, dependence, 1);
		    }

		    return localDep;
		},
		isLeaf : function() {
		    return edges.length === 0;
		},
		edges: function() {
		    return edges;
		},
		removeEdge : function(edge) {
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

		    var edgeTo = module.edge(node, to);
		    edges.push(edgeTo);
		    try {
			assertNoCycles(node);
			return edgeTo;
			
		    } catch (err) {
			edges.splice(edges.indexOf(edgeTo), 1);
			throw err;
		    }
		},
		p: function() {
		    if (edges.length === 0) {
			return localE;
		    } else {
			return ProcessModel.CombineEvidence(localDep, edges.map(function(e){
			    return {
				necessity: e.necessity(),
				sufficiency: e.sufficiency(),
				evidence: e.node().p()
			    };
			}));
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
		url: function(u) {
		    if (u) {
			url = u;
			return this;
		    }
		    return url;
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

	    if (nodes.empty()) {
		root = node;
	    }
	    nodes.set(node.name(), node);

	    return node;
	},
	edge: function(from, to) {
	    var necessity = 0.5,
		sufficiency = 0.5;

	    var edge = {
		necessity : function(n) {
		    if (n) {
			necessity = clamp(0, n, 1);
			return edge;
		    }
		    return necessity;
		},
		sufficiency : function(s) {
		    if (s) {
			sufficiency = clamp(0, s, 1);
			return edge;
		    }
		    return sufficiency;
		},
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
	    return edge;
	}
    };

    module.reset();
    return module;
};
