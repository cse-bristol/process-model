"use strict";

/*global require, module*/

var d3 = require("d3"),
    dagre = require("dagre"),
    helpers = require("./helpers.js"),
    callbacks = helpers.callbackHandler,
    defaultNodeWidth = 240,
    defaultNodeHeight = 70,
    nodeSidePadding = 10;

module.exports = function(nodes) {
    var collapsedNodes = d3.set(),
	manualPositions = d3.map(),
	manualSizes = d3.map(),
	
	onSetSize = callbacks(),
	onRemoveSize = callbacks(),
	onSetPosition = callbacks(),
	onRemovePosition = callbacks(),
	onCollapse = callbacks(),
	onExpand = callbacks();

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
	
    function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var cleanup = function() {
	collapsedNodes.forEach(function(n){
	    if (!nodes.has(n)) {
		module.collapsed(n);
	    }
	});
	manualPositions.keys().forEach(function(n){
	    if (!nodes.has(n)) {
		module.removePosition(n);
	    }
	});
    };

    var nodesToKeep = function() {
	var stack = [nodes.root()],
	    found = d3.map(),
	    foundFromCollapsed = d3.set();

	while(stack.length > 0) {
	    var current = stack.pop(),
		isCollapsed = collapsedNodes.has(current.id);

	    found.set(current.id, current);

	    current.edges().forEach(function(e){
		/* 
		 If we reach a node from any uncollapsed node, or from two or more collapsed nodes, we'll keep it.
		 */
		if (found.has(e.node().id)) {
		    // NOOP

		} else if (!isCollapsed || foundFromCollapsed.has(e.node().id)) {
		    stack.push(e.node());
		    foundFromCollapsed.remove(e.node().id);

		} else {
		    foundFromCollapsed.add(e.node().id);
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
		if (targets.has(currentNode.id)) {
		    // NOOP

		} else if (!reachable.has(currentNode.id)) {
		    stack = stack.concat(currentNode.edges());
		} else {
		    targets.set(currentNode.id, currentNode);
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
	    if (displayNodes.has(node.id)) {
		return displayNodes.get(node.id);
	    }

	    var displayEdges,
		displayNode = Object.create(node);

	    displayNode.isView = true;

	    if (collapsedNodes.has(node.id)) {
		displayEdges = buildCollapsedEdges(displayNode);

		displayNode.collapsed = function(shouldCollapse) {
		    if (shouldCollapse === false) {
			module.expand(node.id);
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
			if (e.node().id === n.id) {
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
			module.collapsed(node.id);
			return this;
		    } else {
			return false;
		    }
		};
	    }

	    displayNode.id = node.id;

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

		    module.position(node.id, xy);
		    return displayNode;
		} else {
		    return manualPositions.get(node.id);
		}
	    };

	    displayNode.autoPosition = function() {
		module.removePosition(node.id);
		module.removeSize(node.id);
	    };

	    displayNode.size = function(pos) {
		if (pos === undefined) {
		    if (manualSizes.has(node.id)) {
			return manualSizes.get(node.id);
		    } else {
			return [defaultNodeWidth, defaultNodeHeight];
		    }
		}
		module.size(node.id, [
		    pos[0] < 80 ? 80 : pos[0],
		    pos[1] < 50 ? 50 : pos[1]
		]);
		return displayNode;
	    };

	    displayNode.innerWidth = function() {
		return displayNode.size()[0] - (2 * displayNode.sidePadding());
	    };

	    displayNode.center = function() {
		var s = displayNode.size();
		return [s[0] / 2, s[1] / 2];
	    };

	    displayNode.sidePadding = function() {
		return nodeSidePadding;
	    };
	    
	    if (manualPositions.has(node.id)) {
		var xy = manualPositions.get(node.id);
		displayNode.x = xy[0];
		displayNode.y = xy[1];
	    }

	    displayNodes.set(node.id, displayNode);
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
	    rootSize = root.size(),
	    /* If the root node isn't manually positioned, we'll offset it a little bit.
	     We also account for Dagre using the middle of the node, while we use the top-left corner. */
 	    xOffset = (root.x ? root.x : 10) + (rootSize[0] / 2),
	    yOffset = (root.y ? root.y : (window.innerHeight / 3)) + (rootSize[1] / 2);

	while (toRead.length > 0) {
	    var node = toRead.pop();
	    nodePositions.set(node.id, node);

	    node.edges().forEach(function(e){
		if (e.node().x || e.node().y) {
		    manualEdgePositions.push(e);
		} else {
		    toRead.push(e.node());
		    edgePositions.push([node.id, e.node().id]);
		}
	    });
	}

	nodePositions.keys().forEach(function(n){
	    var size = manualSizes.has(n) ? manualSizes.get(n) : [defaultNodeWidth, defaultNodeHeight];
	    graph.addNode(n, {
		label: n,
		width: size[0], 
		height: size[1]
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
	    rootLayout = layout._nodes[root.id].value;

	xOffset -= rootLayout.x;
	yOffset -= rootLayout.y;

	layout.eachNode(function(n, val){
	    var node = nodePositions.get(n),
		size = node.size();
	    /* 
	     Account for the initial position of the root node (which modes the whole graph).
	     Also account for Dagre's coordinates being the centre of the node.
	     */
	    node.x = val.x + xOffset - (size[0] / 2);
	    node.y = val.y + yOffset - (size[1] / 2);
	});

	layout.eachEdge(function(e, u, v, value){
	    var from = nodePositions.get(u),
		to = nodePositions.get(v),
		edge = from.edgeTo(to),
		fromSize = from.size(),
		toSize = to.size();

	    edge.path = [];

	    edge.path.push([from.x + fromSize[0], from.y + fromSize[1] / 2]);

	    value.points.forEach(function(p){
		edge.path.push([p.x + xOffset, p.y + yOffset]);
	    });

	    edge.path.push([to.x, to.y + toSize[1] / 2]);
	});

	manualEdgePositions.forEach(function(e){
	    var fromSize = e.parent().size(),
		toSize = e.node().size(),
		start = [e.parent().x + fromSize[0], e.parent().y + fromSize[1] / 2],
		end = [e.node().x, e.node().y + toSize[1] / 2],
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
	    if (visited.has(current.id)) {
		// NOOP
	    } else {
		visited.add(current.id);
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
	position: function(id, position) {
	    if (id && position) {
		manualPositions.set(id, position);
		onSetPosition(id, position);
		return module;
	    } else {
		return manualPositions;
	    }
	},
	removePosition: function(id) {
	    if (manualPositions.has(id)) {
		var oldValue = manualPositions.get(id);
		manualPositions.remove(id);
		onRemovePosition(id, oldValue);
	    }

	    return module;
	},
	onSetPosition: onSetPosition.add,
	onRemovePosition: onRemovePosition.add,
	
	collapsed: function(id) {
	    if (id) {
		collapsedNodes.add(id);
		onCollapse(id);
		return module;
	    } else {
		return collapsedNodes;
	    }
	},
	expand: function(id) {
	    collapsedNodes.remove(id);
	    onExpand(id);
	    return module;
	},
	onCollapse: onCollapse.add,
	onExpand: onExpand.add,
	
	size: function(id, s) {
	    if (s === undefined) {
		return manualSizes;
	    } else {
		manualSizes.set(id, s);
		onSetSize(id, s);
		return module;
	    }
	},
	removeSize: function(id) {
	    if (manualSizes.has(id)) {
		var oldValue = manualSizes.get(id);
		manualSizes.remove(id);
		onRemoveSize(id, oldValue);
	    }

	    return module;
	},
	onSetSize: onSetSize.add,
	onRemoveSize: onRemoveSize.add,
	
	display: function() {
	    cleanup();

	    var reachable = nodesToKeep(),
		reachableCollapsed = nodes.all().filter(function(n){
		    return reachable.has(n.id) && collapsedNodes.has(n.id);
		}),
		displayGraph = buildDisplayGraph(reachable);

	    var result = asNodeAndEdgeLists(displayGraph);

	    if (!manualPositions.has(displayGraph.id)) {
		/* Set the position of the root node. */
		module.position(displayGraph.id, [0, 0]);
	    }

	    var layoutRoots = result.nodes.filter(function(n){
		return manualPositions.has(n.id) && reachable.has(n.id);
	    });

	    while (layoutRoots.length > 0) {
		autoLayout(layoutRoots.pop());
	    }

	    return result;
	},

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

    return module;
};
