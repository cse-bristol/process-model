"use strict";

/*global d3, dagre, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Layout = function(root) {
    var graph = new dagre.Digraph(),
	toRead = [root];

    while (toRead.length > 0) {
	var node = toRead.pop();
	graph.addNode({
	    name: node.name(),
	    width: 150,
	    height: 50});

	node.edges.forEach(function(e){
	    toRead.push(e.node());
	    graph.addEdge(null, node.name(), e.node().name());
	});
    }

    var layout = dagre.layout().run(graph);
    

    return layout;

    /* todo, replace these nodes with our actual nodes */
};
