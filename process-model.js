"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var nodes = ProcessModel.Nodes();

var rootNode = nodes.create("root")
	.description("The root node of our model, as a process.")
	.localEvidence([0.25, 0.75]);

var joinedNode = nodes.create("child process");

rootNode.addEdge(ProcessModel.Edge(joinedNode));

var zoom = d3.behavior.zoom()
	.scaleExtent([0.1, 10])
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

zoom(svg);

var nodeHeight = 50,
    nodeWidth = 150,
    nodeSidePadding = 10,
    nodeInnerWidth = nodeWidth - (2 * nodeSidePadding),
    nodeCenter = [nodeWidth / 2 , nodeHeight / 2];

var draw = function() {
    var layout = ProcessModel.Layout(rootNode, nodeWidth, nodeHeight);
    
    var nodeDisplay = g.selectAll("g.process-node")
	    .data(layout.nodes, function(d, i){
		return d.name();
	    });

    nodeDisplay.exit().remove();

    var newNodes = nodeDisplay.enter()
	    .append("g")
	    .classed("process-node", true);

    newNodes
	.append("rect")
	.attr("width", nodeWidth + "px")
	.attr("height", nodeHeight + "px");

    newNodes
	.append("text")
	.attr("y", "20px")
	.attr("x", nodeCenter[0] + "px")
	.attr("textLength", nodeInnerWidth + "px")
	.attr("lengthAdjust", "spacingAndGlyphs")
	.attr("text-anchor", "middle");

    var closeEnough = function(bbox, x, y) {
	return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
	    (bbox.y >= y || (bbox.y + bbox.height) <= y);
    };

    var findDragTarget = function() {
	var target = document.elementFromPoint(d3.event.sourceEvent.x, d3.event.sourceEvent.y);
	while (target.parentNode) {
	    var targetSelection = d3.select(target);
	    if (targetSelection.classed("process-node")) {
		return targetSelection;
	    } else {
		target = target.parentNode;
	    }
	}
	return null;
    };

    var dragNode = d3.behavior.drag()
	    .on("dragstart", function(d){
		/* Nothing else should get this click now. */
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d){
		/* Highlight things we're dragging over to aid the user. */
		var target = findDragTarget();
		if (target === d.previousDragTarget) {
		    return;
		} else {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		    if (target) {
			target.classed("drag-target", true);
		    }
		    d.previousDragTarget = target;
		}
	    })
	    .on("dragend", function(d, i){
		/* See if we're over an existing different node. 
		 If so, make an edge to it.
		 Otherwise, we'll make an edge to a new node. */
		var oldNode = d,
		    target = findDragTarget(),
		    newNode = (target && target.datum() != oldNode) ? target.datum() : nodes.create();
		
		try {
		    oldNode.addEdge(ProcessModel.Edge(newNode)); 
		} finally {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		}
		draw();
	    });

    newNodes
	.append("circle")
	.classed("handle", true)
	.attr("cy", nodeHeight + "px")
	.attr("cx", nodeCenter[0] + "px")
	.attr("r", "5px")
	.attr("draggable", true)
	.call(dragNode);

    nodeDisplay.attr("transform", function(d, i){
	return "translate(" + (d.x - nodeCenter[0]) + "," + d.y + ")";
    });

    nodeDisplay.selectAll("text")
	.html(function(d, i){
	    return d.name();
	});

    newNodes.append("g")
	.classed("interval", "true")
	.attr("transform", "translate(0,30)");

    var parts = nodeDisplay.selectAll(".interval")
	    .selectAll("rect")
    	    .data(function(d, i){
		var p = d.p();
		return [
		    {type: "success", width: p[0], x: 0},
		    {type: "uncertainty", width: p[1] - p[0], x: p[0]},
		    {type: "failure", width: 1 - p[1], x: p[1]}
		];
	    });

    parts.enter()
	.append("rect")
	.attr("height", "15px");

    parts
	.attr("class", function(d, i){
	    return d.type;
	})
	.attr("x", function(d, i){
	    return (nodeSidePadding + (nodeInnerWidth * d.x)) + "px";
	})
	.attr("width", function(d, i){
	    return (nodeInnerWidth * d.width) + "px";
	});

    var edges = g.selectAll("path")
	    .data(layout.edges);

    edges.exit().remove();
    
    edges.enter()
	.append("path")
	.attr("stroke", "black")
	.attr("stroke-width", 0.5)
	.attr("fill", "none");

    edges.attr("d", d3.svg.line().interpolate("basis"));
};

draw();
