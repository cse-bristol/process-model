"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Nodes = function() {
    var nodes, newNodes, root,
	nodeInterface = {},
	edgeInterface = {};

    ["localEvidence", 
     "dependence",
     "isLeaf",
     "edges",
     "edgeTo",
     "removeEdge",
     "p",
     "name",
     "url",
     "countDescendents",
     "collapsed",
     "canCollapse"].forEach(function(f){
	 nodeInterface[f] = function() {
	     throw "Not implemented";
	 };
     });

    ["necessity",
     "sufficiency",
     "node",
     "parent",
     "disconnect",
     "canModifiy"].forEach(function(f){
	edgeInterface[f] = function() {
	    throw "Not Implemented";
	};
    });

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
	    var localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
		localDep = 1,
		edges = [],
		url = null,
		name = startName ? startName : "new " + newNodes++;	    
	    var node = {
		prototype: nodeInterface,
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
		collapsed: function(shouldCollapse) {
		    if (shouldCollapse) {
			return module.collapse(node);
		    }
		    return false;
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
		prototype: edgeInterface,
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
		},
		canModify: function() {
		    return true;
		}
	    };
	    return edge;
	},
	combinedEdge: function(from, to) {
	    var edge = {
		prototype: edgeInterface,
		necessity: function(n) {
		    throw "Necessity has no meaning on combined edge from " + from.name() + " to " + to.name();
		},
		sufficiency: function(s) {
		    throw "Sufficiency has no meaning on on combined edge from " + from.name() + " to " + to.name();
		},
		node: function() {
		    return to;
		},
		parent: function() {
		    return from;
		},
		disconnect: function() {
		    throw "Cannot disconnect a combined edge";
		},
		canModify: function() {
		    return false;
		}
	    };
	    return edge;
	},
	collapse: function(node) {
	    var nodesToCollapse = d3.map(nodes),
		edges = [];

	    if (node.collapsed()) {
		throw "Node already collapsed: " + node.name();
	    }

	    var collapsedNode = {
		prototype: nodeInterface,
		localEvidence: function() {
		    throw "Local evidence not applicable for a collapsed node " + node.name();
		},
		dependence: function(d) {
		    throw "Dependence has no meaning for a collapsed node " + node.name();
		},
		isLeaf: function() {
		    return edges.length === 0;
		},
		edges: function() {
		    return edges;
		},
		edgeTo: function(to) {
		    var existingEdge;
		    edges.forEach(function(e){
			if (e.node() === to) {
			    existingEdge = e;
			}
		    });
		    if (existingEdge) {
			return existingEdge;
		    }

		    throw "Cannot add new edges to a collapsed node " + node.name();
		},
		removeEdge: function() {
		    throw "Cannot remove edges from a collapsed node " + node.name();
		},
		p: function() {
		    return node.p();
		},
		name: function() {
		    return node.name();
		},
		url: function() {
		    return node.url();
		},
		countDescendents : function() {
		    return node.countDescendents();
		},
		collapsed: function(shouldCollapse) {
		    if (shouldCollapse === false) {
			if (root === collapsedNode) {
			    root = node;
			}

			edgesToNode(collapsedNode).forEach(function(e){
			    e.disconnect();
			    e.parent().edgeTo(node)
				.necessity(e.necessity())
				.sufficiency(e.sufficiency());
			});

			removeUnreachable();

			nodesToCollapse.values().forEach(function(n){
			    nodes.set(n.name(), n);
			});
		    }
		    return true;
		},
		canCollapse: function() {
		    return false;
		}
	    };

	    if (root === node) {
		root = collapsedNode;
	    }

	    edgesToNode(node).forEach(function(e){
		e.disconnect();
		e.parent().edgeTo(collapsedNode)
		    .necessity(e.necessity())
		    .sufficiency(e.sufficiency());
	    });

	    removeUnreachable();

	    nodes.keys().forEach(function(n){
		nodesToCollapse.remove(n);
	    });
	    nodesToCollapse.set(node.name(), node);

	    var children = d3.set();
	    nodesToCollapse.values().forEach(function(n){
		n.edges().forEach(function(e){
		    // don't make edges to any nodes in nodesToCollapse
		    // don't make edges to nodes that we've already pointed at
		    if (nodesToCollapse.has(e.node().name())
			|| children.has(e.node().name())) {
			return;
		    }

		    edges.push(module.combinedEdge(collapsedNode, e.node()));
		});
	    });
	    return collapsedNode;
	}
    };

    module.reset();
    return module;
};
