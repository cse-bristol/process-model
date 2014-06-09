"use strict";

/*global d3 */

var svg = d3.select("svg#model");

var g = svg.append("g");

var fakeData = g.selectAll("circle")
	.data([1, 2, 3])
	.enter()
	.append("circle")
	.attr("cx", 100)
	.attr("cy", 100)
	.attr("r", 50);

var zoom = d3.behavior.zoom()
	.scaleExtent([0.1, 10])
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

zoom(svg);
