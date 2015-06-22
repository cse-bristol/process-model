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
	var graph = new dagre.Digraph(),
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

	    if (visited.has(id) || nodePositions.has(id)) {
		continue;
	    } else {
		visited.add(id);
		
		var size = sizes.get(id).size;

		graph.addNode(
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

	    graph.addEdge(
		null,
		e.parent().id,
		e.node().id
	    );	
	}

	var layout = dagre.layout()
		.nodeSep(10)
		.rankSep(40)
		.rankDir(layoutState.getOrientation())
		.run(graph),

	    offset = calcOffset(layout);

	/*
	 Turn each node into a view model and add it to the nodeViewModels dictionary.
	 */
	layout.eachNode(function(id, val) {
	    nodePositions.set(
		id,
		[
		    val.x + offset[0] - (val.width / 2),
		    val.y + offset[1] - (val.height / 2)
		]
	    );
	});

	layout.eachEdge(function(e, fromId, toId, val) {
	    edgeResults.push({
		edge: nodesCollection.get(fromId)
		    .edgeTo(
			nodesCollection.get(toId)
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
	    function(layout) {
		var desired = layoutState.getPosition(r.id),
		    n = layout.node(r.id);

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
