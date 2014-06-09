"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var rootNode = ProcessModel.Node()
	.name("root")
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

var draw = function() {
    var layout = ProcessModel.Layout(rootNode);
	
    var nodes = g.selectAll("g")
	    .data(layout.nodes);

    nodes.exit().remove();

    var newNodes = nodes.enter()
	    .append("g")
	    .classed("process-node", true);

    var nodeHeight = 50,
	nodeWidth = 150,
	nodeSidePadding = 10;

    newNodes
	.append("rect")
	.attr("width", nodeWidth + "px")
	.attr("height", nodeHeight + "px");

    newNodes
	.append("text")
	.attr("y", "20px")
	.attr("x", (nodeWidth / 2) + "px")
	.attr("textLength", (nodeWidth - (2 * nodeSidePadding)) + "px")
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
		nodeData.push(newNode);
		draw();
	    });

    newNodes
	.append("circle")
	.classed("handle", true)
	.attr("cy", "50px")
	.attr("cx", "75px")
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
	    return (15 + (120 * d.x)) + "px";
	})
	.attr("width", function(d, i){
	    return (120 * d.width) + "px";
	});

};

draw();
