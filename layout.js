"use strict";

/*global d3, dagre, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Layout = function(root, nodeWidth, nodeHeight) {
    var graph = new dagre.Digraph(),
	toRead = [root],
	nodes = d3.map({}),
	edges = [];

    while (toRead.length > 0) {
	var node = toRead.pop();
	nodes.set(node.name(), node);

	node.edges().forEach(function(e){
	    toRead.push(e.node());
	    edges.push([node.name(), e.node().name()]);
	});
    }

    nodes.keys().forEach(function(n){
	graph.addNode(n, {
	    label: n,
	    width: nodeWidth,
	    height: nodeHeight
	});
    });

    edges.forEach(function(e){
	graph.addEdge(null, e[0], e[1]);
    });

    var layout = dagre.layout().run(graph);
    layout.eachNode(function(n, val){
	var node = nodes.get(n);
	node.x = val.x;
	node.y = val.y;
    });

    var edgeLayout = [], 
	shiftRight = 0;
    //var shiftRight = nodeWidth / 2; /* We want our lines to go from the centre of the node.  */
    layout.eachEdge(function(e, u, v, value){
	var edge = [],
	    from = nodes.get(u),
	    to = nodes.get(v);

	edge.push([from.x + shiftRight, from.y + nodeHeight]);

	value.points.forEach(function(p){
	    edge.push([p.x + shiftRight, p.y + (nodeHeight / 2)]);
	});

	edge.push([to.x + shiftRight, to.y]);

	edgeLayout.push(edge);
    });

    return {
	nodes: nodes.values(),
	edges: edgeLayout
    };
};
