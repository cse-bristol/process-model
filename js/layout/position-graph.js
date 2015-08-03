"use strict";

/*global require, module*/

var d3 = require("d3"),
    dagre = require("dagre");

/*
 Given some nodes and a layout state, output lists of view-models for nodes and edges.
 
 Dagre uses the centre of a node as its position, whereas we use the top-left corner.
 */
module.exports = function(isVisible, sizes, nodesCollection, layoutState) {
    /*
     This function is designed to be called repeatedly to automatically layout sections of our process graph.

     The whole graph is translated by the offset function after it has been laid out.

     This function does not return anything: it accumulates its results into the nodePositions dictionary and edgeResults list.
     */
    var autoLayout = function(startNodes, calcOffset, nodePositions, edgeResults) {
	var graph = new dagre.graphlib.Graph(),
	    toRead = startNodes,
	    visited = d3.set(),

	    edgeStack = [],
	    
	    manualEdges = [];

	/*
	 Sets up the graph label as an empty object.
	 */
	graph.setGraph({
	    nodesep: 10,
	    ranksep: 40,
	    rankdir: layoutState.getOrientation()
	});

	/*
	 Traverses the process-model from the given start nodes, excluding and stopping at any manually positioned nodes.

	 Nodes are added to the Dagre graph immediately. Edges are queued up for later.
	 */
	while (toRead.length > 0) {
	    var node = toRead.pop(),
		id = node.id;

	    if (visited.has(id) || nodePositions.has(id)) {
		continue;
	    } else {
		visited.add(id);
		
		var size = sizes.get(id).size;

		graph.setNode(
		    id,
		    {
			label: id,
			width: size[0], 
			height: size[1]
		    }
		);

		node.edges().forEach(function(e) {
		    if (isVisible(e.node().id)) {
			if (layoutState.getPosition(e.node().id) || nodePositions.has(e.node().id)) {
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

	    graph.setEdge(
		e.parent().id,
		e.node().id,
		{
		    label: ""
		}
	    );	
	}

	dagre.layout(graph);
	
	var offset = calcOffset(graph);

	/*
	 Turn each node into a view model and add it to the nodeViewModels dictionary.
	 */
	graph.nodes().forEach(function(nodeId) {
	    var node = graph.node(nodeId);

	    nodePositions.set(
		nodeId,
		[
		    node.x + offset[0] - (node.width / 2),
		    node.y + offset[1] - (node.height / 2)
		]
	    );
	});

	graph.edges().forEach(function(edge) {
	    var outEdge = graph.edge(edge);

	    edgeResults.push({
		edge: nodesCollection.get(edge.v)
		    .edgeTo(
			nodesCollection.get(edge.w)
		    ),
		fromId: edge.v,
		toId: edge.w,

		labelPos: [
		    outEdge.x,
		    outEdge.y
		],
		
		points: outEdge.points.map(function(p) {
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

    var nodePositions = d3.map(),
	edgeResults = [];
    
    /*
     First place orphaned nodes which don't have a position.
     (Note that orphaned nodes are always considered 'reachable', since they have no parent to collapse.)
     */
    autoLayout(
	nodesCollection.nodesWithoutParents()
	    .filter(function(id) {
		return !layoutState.getPosition(id);
	    })
	    .map(function(id) {
		return nodesCollection.get(id);
	    }),
	function(nodes) {
	    return [10, 100];
	},
	nodePositions,
	edgeResults	
    );
    
    /*
     Place things which have been given a manual position.
     */
    nodesCollection.all().filter(function(n) {
	return layoutState.getPosition(n.id) && isVisible(n.id);
    }).forEach(function(r) {
	autoLayout(
	    [r],
	    function(graph) {
		var desired = layoutState.getPosition(r.id),
		    n = graph.node(r.id);

		return [
		    (n.width / 2) + desired[0] - n.x,
		    (n.height / 2) + desired[1] - n.y
		];
	    },
	    nodePositions,
	    edgeResults
	);
    });

    return {
	nodes: nodePositions,
	edges: edgeResults
    };
};
