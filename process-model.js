"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var fakeData = [
    ProcessModel.Node()
	.name("process-modelling")
	.description("The root node of our model, as a process.")
	.localEvidence([0.25, 0.75]),
    ProcessModel.Node()
	.name("collecting")
	.description("Another node of our model.")
	.localEvidence([0.7, 0.9])
];

fakeData[0].x = 50;
fakeData[0].y = 50;

fakeData[1].x = 200;
fakeData[1].y = 200;

var nodes = g.selectAll("g")
	.data(fakeData);

nodes.exit().remove();

var newNodes = nodes.enter()
	.append("g")
	.classed("process-node", true);

newNodes
    .append("rect")
    .attr("width", "150px")
    .attr("height", "50px");

newNodes
    .append("text")
    .attr("y", "20px")
    .attr("x", "75px")
    .attr("textLength", "130px")
    .attr("lengthAdjust", "spacingAndGlyphs")
    .attr("text-anchor", "middle");

nodes.attr("transform", function(d, i){
    return "translate(" + d.x + "," + d.y + ")";
});

nodes.select("text")
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

var zoom = d3.behavior.zoom()
	.scaleExtent([0.1, 10])
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

zoom(svg);

