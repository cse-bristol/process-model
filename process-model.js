"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var rootNode = ProcessModel.Node()
	.name("first")
	.description("The root node of our model, as a process.")
	.localEvidence([0.25, 0.75]);

var joinedNode = ProcessModel.Node()
	.name("joined");

joinedNode.x = 100;
joinedNode.y = 100;
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
	
    var nodes = g.selectAll("g.process-node")
	    .data(layout.nodes);

    nodes.exit().remove();

    var newNodes = nodes.enter()
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

    var dragNode = d3.behavior.drag()
	    .on("dragstart", function(){
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(){
	    })
	    .on("dragend", function(d, i){
		var oldNode = d;
		var newNode = ProcessModel.Node().name("new");
		oldNode.addEdge(ProcessModel.Edge(newNode));
		draw();
	    });

    newNodes
	.append("circle")
	.classed("handle", true)
	.attr("cy", nodeHeight + "px")
	.attr("cx", nodeCenter[0] + "px")
	.attr("r", "3px")
	.attr("draggable", true)
	.call(dragNode);

    nodes.attr("transform", function(d, i){
	return "translate(" + d.x + "," + d.y + ")";
    });

    nodes.selectAll("text")
	.html(function(d, i){
	    return d.name();
	});

    newNodes.append("g")
	.classed("interval", "true")
	.attr("transform", "translate(0,30)");

    var parts = nodes.selectAll(".interval")
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

    var edgeLine = d3.svg.line()
	    .interpolate("basis");
    
    edges.exit().remove();
    
    edges.enter()
	.append("path")
	.attr("stroke", "black")
	.attr("stroke-width", 0.5)
	.attr("fill", "none")
	.attr("d", edgeLine);
};

draw();
