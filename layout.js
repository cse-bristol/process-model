"use strict";

/*global d3, dagre, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Layout = function(nodes, nodeWidth, nodeHeight) {
    var collapsedNodes = d3.set(),
	manualPositions = d3.map(),
	halfWidth = nodeWidth / 2,
	halfHeight = nodeHeight / 2;

    function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var cleanup = function() {
	collapsedNodes.forEach(function(n){
	    if (!nodes.has(n)) {
		collapsedNodes.remove(n);
	    }
	});
	manualPositions.keys().forEach(function(n){
	    if (!nodes.has(n)) {
		manualPositions.remove(n);
	    }
	});
    };

    var nodesToKeep = function() {
	var stack = [nodes.root()],
	    found = d3.map(),
	    foundFromCollapsed = d3.set();

	while(stack.length > 0) {
	    var current = stack.pop(),
		isCollapsed = collapsedNodes.has(current.name());

	    found.set(current.name(), current);

	    current.edges().forEach(function(e){
		/* 
		 If we reach a node from any uncollapsed node, or from two or more collapsed nodes, we'll keep it.
		 */
		if (found.has(e.node().name())) {
		    // NOOP

		} else if (!isCollapsed || foundFromCollapsed.has(e.node().name())) {
		    stack.push(e.node());
		    foundFromCollapsed.remove(e.node().name());

		} else {
		    foundFromCollapsed.add(e.node().name());
		}
	    });
	}

	return found;
    };

    var buildDisplayGraph = function(reachable) {
	var displayNodes = d3.map();

	var buildCollapsedEdges = function(collapsedNode) {
	    var targets = d3.map(),
		stack = collapsedNode.edges().slice(0);

	    while(stack.length > 0) {
		var currentEdge = stack.pop(),
		    currentNode = currentEdge.node();
		if (targets.has(currentNode.name())) {
		    // NOOP

		} else if (!reachable.has(currentNode.name())) {
		    stack = stack.concat(currentNode.edges());
		} else {
		    targets.set(currentNode.name(), currentNode);
		}
	    }

	    return targets.values().map(function(n){
		return buildCollapsedEdge(buildDisplayNode(n), collapsedNode);
	    });
	};

	var buildCollapsedEdge = function(target, parent) {
	    return {
		necessity: function(n) {
		    throw "Necessity may not be inspected or modified on edge from collapsed node " + parent.name() + " to " + target.name();
		},
		sufficiency: function() {
		    throw "Sufficiency may not be inspected or modified on edge from collapsed node " + parent.name() + " to " + target.name();
		},
		node: function() {
		    return target;
		},
		parent: function() {
		    return parent;
		},
		disconnect: function() {
		    throw "Cannot disconnect edge from collapsed node " + parent.name() + " to " + target.name();
		},
		canModify: function() {
		    return false;
		},
		isView: true
	    };
	};

	var buildDisplayEdge = function(edge, parent) {
	    var e = Object.create(edge);
	    e.canModify = function() {
		return true;
	    };
	    e.node = function() {
		return buildDisplayNode(edge.node());
	    };
	    e.parent = function() {
		return parent;
	    };
	    e.isView = true;
	    return e;
	};

	var buildDisplayNode = function(node) {
	    if (displayNodes.has(node.name())) {
		return displayNodes.get(node.name());
	    }

	    var displayEdges,
		displayNode = Object.create(node);

	    displayNode.isView = true;

	    if (collapsedNodes.has(node.name())) {
		displayEdges = buildCollapsedEdges(displayNode);

		displayNode.collapsed = function(shouldCollapse) {
		    if (shouldCollapse === false) {
			collapsedNodes.remove(node.name());
			return this;
		    } else {
			return true;
		    }
		};
		displayNode.dependence = function(dependence) {
		    throw "Dependence has meaning for collapsed node " + node.name();
		};
		displayNode.edgeTo = function(to) {
		    var existingEdge;
		    displayEdges.forEach(function(e){
			if (e.node() === to) {
			    existingEdge = e;
			}
		    });
		    if (existingEdge) {
			return existingEdge;
		    }

		    throw "Cannot create a new edge on combined node " + node.name();
		};
		displayNode.removeEdge = function() {
		    throw "Cannot remove edges from collapsed node " + node.name();
		};

	    } else {
		displayEdges = node.edges().map(function(e){
		    return buildDisplayEdge(e, displayNode);
		});

		displayNode.edgeTo = function(n) {
		    var found;
		    displayEdges.forEach(function(e){
			if (e.node().name() === n.name()) {
			    found = e;
			}
		    });
		    if (found) {
			return found;
		    } else {
			return Object.getPrototypeOf(displayNode)
			    .edgeTo(n.isView ? Object.getPrototypeOf(n) : n);
		    }
		};
		
		displayNode.collapsed = function(shouldCollapse)  {
		    if (shouldCollapse) {
			collapsedNodes.add(node.name());
			return this;
		    } else {
			return false;
		    }
		};
	    }

	    displayNode.edges = function() {
		return displayEdges;
	    };

	    displayNode.position = function(xy) {
		if (xy) {
		    if (!xy.length || 
			xy.length !== 2 || 
			!isNumber(xy[0]) || 
			!isNumber(xy[1])) {
			throw "Position should be an array of [x, y]. Was " + xy;
		    }

		    manualPositions.set(node.name(), xy);
		    return displayNode;
		} else {
		    return manualPositions.get(node.name());
		}
	    };

	    displayNode.autoPosition = function() {
		manualPositions.remove(node.name());
	    };
	    
	    if (manualPositions.has(node.name())) {
		var xy = manualPositions.get(node.name());
		displayNode.x = xy[0];
		displayNode.y = xy[1];
	    }

	    displayNodes.set(node.name(), displayNode);
	    return displayNode;
	};

	return buildDisplayNode(nodes.root());
    };

    var autoLayout = function(root) {
	var graph = new dagre.Digraph(),
	    toRead = [root],
	    nodePositions = d3.map({}),
	    edgePositions = [],
	    manualEdgePositions = [],
	    xOffset = root.x ? root.x : nodeWidth,
	    yOffset = root.y ? root.y : nodeHeight;

	while (toRead.length > 0) {
	    var node = toRead.pop();
	    nodePositions.set(node.name(), node);

	    node.edges().forEach(function(e){
		if (e.node().x || e.node().y) {
		    manualEdgePositions.push(e);
		} else {
		    toRead.push(e.node());
		    edgePositions.push([node.name(), e.node().name()]);
		}
	    });
	}

	nodePositions.keys().forEach(function(n){
	    graph.addNode(n, {
		label: n,
		width: nodeWidth,
		height: nodeHeight
	    });
	});

	edgePositions.forEach(function(e){
	    graph.addEdge(null, e[0], e[1]);
	});

	var layout = dagre.layout()
		.nodeSep(10)
		.rankSep(70)
		.rankDir("LR")
		.run(graph),
	    rootLayout = layout._nodes[root.name()].value;

	xOffset -= rootLayout.x;
	yOffset -= rootLayout.y;

	layout.eachNode(function(n, val){
	    var node = nodePositions.get(n);
	    node.x = val.x + xOffset;
	    node.y = val.y + yOffset;
	});

	layout.eachEdge(function(e, u, v, value){
	    var from = nodePositions.get(u),
		to = nodePositions.get(v),
		edge = from.edgeTo(to);

	    edge.path = [];

	    edge.path.push([from.x + halfWidth, from.y + halfHeight]);

	    value.points.forEach(function(p){
		edge.path.push([p.x + xOffset, p.y + yOffset + halfHeight]);
	    });

	    edge.path.push([to.x - halfWidth, to.y + halfHeight]);
	});

	manualEdgePositions.forEach(function(e){
	    var start = [e.parent().x + halfWidth, e.parent().y + halfHeight],
		end = [e.node().x - halfWidth, e.node().y + halfHeight],
		middle = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

	    e.path = [start, middle, end];
	});
    };

    var asNodeAndEdgeLists = function(root) {
	var resultNodes = [],
	    resultEdges = [],
	    visited = d3.set(),
	    stack = [root];

	while (stack.length > 0) {
	    var current = stack.pop();
	    if (visited.has(current.name())) {
		// NOOP
	    } else {
		visited.add(current.name());
		resultNodes.push(current);
		resultEdges = resultEdges.concat(current.edges());
		stack = stack.concat(current.edges().map(function(e){
		    return e.node();
		}));
	    }
	}
	return {
	    nodes: resultNodes,
	    edges: resultEdges
	};
    };

    var module = {
	position: function(name, position) {
	    if (name && position) {
		manualPositions.set(name, position);
		return this;
	    } else {
		return manualPositions;
	    }
	},
	collapsed: function(c) {
	    if (c) {
		collapsedNodes.add(c);
		return this;
	    } else {
		return collapsedNodes;
	    }
	},
	display: function() {
	    cleanup();

	    var reachable = nodesToKeep(),
		reachableCollapsed = nodes.all().filter(function(n){
		    return reachable.has(n.name()) && collapsedNodes.has(n.name());
		}),
		displayGraph = buildDisplayGraph(reachable);

	    var result = asNodeAndEdgeLists(displayGraph);

	    if (!manualPositions.has(displayGraph.name())) {
		/* Set the position of the root node. */
		manualPositions.set(displayGraph.name(), [0, 0]);
	    }

	    var layoutRoots = result.nodes.filter(function(n){
		return manualPositions.has(n.name()) && reachable.has(n.name());
	    });

	    while (layoutRoots.length > 0) {
		autoLayout(layoutRoots.pop());
	    }

	    return result;
	}
    };

    return module;
};
