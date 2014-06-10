"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var nodes = ProcessModel.Nodes();

var rootNode = nodes.create("root")
	.description("The root node of our model, as a process.")
	.localEvidence([0.25, 0.75]);

var joinedNode = nodes.create("child process")
.localEvidence([0.1, 0.9]);

rootNode.addEdge(joinedNode);

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

var drawIntervalParts = function(g, pFun) {
    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
    var parts = g.selectAll("rect")
    	    .data(function(d, i){
		var p = pFun(d, i);
		return [
		    {type: "failure", width: p[0], x: 0},
		    {type: "uncertainty", width: p[1] - p[0], x: p[0]},
		    {type: "success", width: 1 - p[1], x: p[1]}
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
};

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

    ProcessModel.svgEditableText(
	newNodes,
	0,
	5, 
	nodeWidth,
	21, 
	"node-name");
	
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
		    oldNode.addEdge(newNode); 
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

    nodeDisplay.selectAll(".node-name")
	.attr("value", function(d, i){
	    return d.name();
	});

    newNodes.append("g")
	.classed("computed-interval", "true")
	.attr("transform", "rotate(180, 75, 0)translate(0,-45)");

    newNodes.append("g")
	.classed("local-interval", "true")
	.attr("transform", "translate(10,1)rotate(90)scale(0.15,0.5)");

    drawIntervalParts(nodeDisplay.select(".computed-interval"), function(d, i){ return d.p();});
    drawIntervalParts(nodeDisplay.select(".local-interval"), function(d, i){ return d.localEvidence();});

    var edges = g.selectAll("g.edge")
	    .data(layout.edges);

    edges.exit().remove();

    edges.enter()
	.append("g")
	.classed("edge", true);

    var edgePaths = edges.selectAll("path")
	.data(function(d, i){
	    return [d.path];
	});

    edgePaths.exit().remove();

    edgePaths.enter()
	.append("path")
	.attr("stroke", "black")
	.attr("stroke-width", 0.5)
	.attr("fill", "none");

    edgePaths.attr("d", d3.svg.line().interpolate("basis"));

    var edgeEnds = edges.selectAll("circle")
	.data(function(d, i){
	    return [d];
	});

    edgeEnds.exit().remove();

    edgeEnds.enter()
	.append("circle")
    .attr("r", "2px");

    edgeEnds     
	.attr("cx", function(d, i){
	    return d.path[d.path.length - 1][0];
	})
	.attr("cy", function(d, i){
	    return d.path[d.path.length - 1][1];
	})
	.on("click", function(d, i){
	    d.disconnect(rootNode);
	    draw();
	});
};

draw();
