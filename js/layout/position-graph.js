"use strict";

/*global require, module*/

var d3 = require("d3"),
    _ = require("lodash"),
    dagre = require("dagre"),
    viewModel = require("./view-model.js"),
    
    defaultNodeWidth = 240,
    defaultNodeHeight = 70,
    defaultSize = [defaultNodeWidth, defaultNodeHeight];


/*
 Return a list of ids for nodes which are not hidden inside other collapsed nodes.
 */
var nodesToKeep = function(startNodes, isCollapsed, nodes) {
    var stack = startNodes,
	found = d3.map(),
	foundFromCollapsed = d3.set();

    while(stack.length > 0) {
	var node = stack.pop(),
	    id = node.id,
	    collapsed = isCollapsed(id);

	found.set(id, node);

	node.edges().forEach(function(e){
	    /* 
	     If we reach a node from any uncollapsed node, or from two or more collapsed nodes, we'll keep it.
	     */
	    if (found.has(e.node().id)) {
		// NOOP

	    } else if (!collapsed || foundFromCollapsed.has(e.node().id)) {
		stack.push(e.node());
		foundFromCollapsed.remove(e.node().id);

	    } else {
		foundFromCollapsed.add(e.node().id);
	    }
	});
    }

    return found;
},
    
    /*
     This function is designed to be called repeatedly to automatically layout sections of our process graph.

     The whole graph is translated by the offset.

     This function does not return anything: it accumulates its results into the nodeViewModels dictionary and edgeResults list.
    */
    autoLayout = function(nodes, layoutState, isReachable, startNodes, offset, nodeViewModels, edgeResults) {
	var graph = new dagre.Digraph(),
	    sizeOrDefault = function(id) {
		return layoutState.getSize(id) || defaultSize;
	    },
	    toRead = startNodes,
	    visited = d3.set(),

	    edgeStack = [],
	    
	    manualEdges = [];

	/*
	 Traverses the process-model from the given start nodes, excluding and stopping at any manually positioned nodes.

	 Nodes are added to the Dagre graph immediately. Edges are queued up for later.
	 */
	while (toRead.length > 0) {
	    var node = toRead.pop(),
		id = node.id;

	    if (visited.has(id) || nodeViewModels.has(id)) {
		continue;
	    } else {
		visited.add(id);
		
		var size = sizeOrDefault(id);

		graph.addNode(
		    id,
		    {
			label: id,
			width: size[0], 
			height: size[1]
		    }
		);

		node.edges().forEach(function(e){
		    if (isReachable(e.node().id)) {
			if (layoutState.getPosition(e.node().id)) {
			    manualEdges.push(e);
			    
			} else {
			    toRead.push(e.node());

			    edgeStack.push(e);
			}
		    }
		});
	    }
	}

	/*
	 Add edges to the graph.
	 */
	while(edgeStack.length) {
	    var e = edgeStack.pop();

	    graph.addEdge(
		null,
		e.parent().id,
		e.node().id
	    );	
	}

	var layout = dagre.layout()
		.nodeSep(10)
		.rankSep(70)
		.rankDir(layoutState.getOrientation())
		.run(graph);

	/*
	 Turn each node into a view model and add it to the nodeViewModels dictionary.
	 */
	layout.eachNode(function(id, val) {
	    var size = sizeOrDefault(id);

	    nodeViewModels.set(
		id,
		viewModel.node(
		    nodes.get(id),
		    size,
		    val.x + offset[0] - (size[0] / 2),
		    val.y + offset[1] - (size[1] / 2),
		    layoutState.isCollapsed(id)
		)
	    );
	});

	/*
	 Queue up the edges to be turned into a view model later (once we've finished adding all the nodes).
	 */
	layout.eachEdge(function(e, fromId, toId, val) {
	    edgeResults.push({
		edge: nodes.get(fromId)
		    .edgeTo(
			nodes.get(toId)
		    ),
		fromId: fromId,
		toId: toId,		
		
		points: val.points.map(function(p) {
		    return [
			p.x + offset[0],
			p.y + offset[1]
		    ];
		})
	    });
	});

	manualEdges.forEach(function(e) {
	    edgeResults.push({
		edge: e,
		fromId: e.parent().id,
		toId: e.node().id
	    });
	});
    };

/*
 Given some nodes and a layout state, output lists of view-models for nodes and edges.
 
 Dagre uses the centre of a node as its position, whereas we use the top-left corner.
 */
module.exports = function(nodes, layoutState) {
    /*
     Find ids of nodes which don't belong 'inside' a collapsed node.
     */
    var reachable = nodesToKeep(
	nodes.nodesWithoutParents().values()
	    .map(function(id) {
		return nodes.get(id);
	    }),
	layoutState.isCollapsed,
	nodes
    ),
	isReachable = _.bind(reachable.has, reachable),
	nodeViewModels = d3.map(),
	edgeResults = [];

    /*
     First place orphaned nodes which don't have a position.
     (Note that orphaned nodes are always considered 'reachable', since they have no parent to collapse.)
     */
    autoLayout(
	nodes,
	layoutState,
	isReachable,
	nodes.nodesWithoutParents().values()
	    .filter(function(id) {
		return !layoutState.getPosition(id);
	    })
	    .map(function(id) {
		return nodes.get(id);
	    }),
	[10, 100],
	nodeViewModels,
	edgeResults	
    );
    
    /*
     Place things which have been given a manual position.
     */
    nodes.all().filter(function(n) {
	return layoutState.getPosition(n.id) && reachable.has(n.id);
    }).forEach(function(r) {
	autoLayout(
	    nodes,
	    layoutState,
	    isReachable,
	    [r],
	    layoutState.getPosition(r.id),
	    nodeViewModels,
	    edgeResults
	);
    });

    return {
	nodes: nodeViewModels.values(),
	edges: edgeResults.map(function(e) {
	    var path = [],
		fromViewModel = nodeViewModels.get(e.fromId),
		toViewModel = nodeViewModels.get(e.toId),
		junctionOffset = 5,
		start = [
		    fromViewModel.x + fromViewModel.size[0] + junctionOffset,
		    fromViewModel.y + (fromViewModel.size[1] / 2)
		],
		end = [
		    toViewModel.x,
		    toViewModel.y + (toViewModel.size[1] / 2)
		];

	    path.push(start);

	    if (e.points) {
		e.points.forEach(function(p) {
		    path.push(p);
		});
		
	    } else {
		path.push([
		    (start[0] + end[0]) / 2,
		    (start[1] + end[1]) / 2
		]);
	    }

	    path.push(end);

	    return viewModel.edge(
		e.edge,
		path,
		layoutState.isCollapsed(e.fromId)
	    );
	})
    };
};
