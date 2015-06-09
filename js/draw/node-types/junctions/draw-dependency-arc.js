"use strict";

/*global module, require*/

var d3 = require("d3"),

    helpers = require("../../../helpers.js"),
    onScroll = helpers.onScroll,
    
    circleFraction = require("../../circle-fraction.js"),

    dependencyArcRadius = 7;

module.exports = function(redrawNode, junctionRadius, getNodeCollection, update) {
    var dragDependency = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d, i) {
		var toChange = getNodeCollection()
			.get(d.data.node.id),
		    
		    fraction = circleFraction(this.parentNode, d3.event);

		toChange.dependence(1 - fraction);
		d.data.node.dependence = toChange.dependence();
		
		redrawNode(d3.select(this.parentNode.parentNode));
	    })
	    .on("dragend", function(d, i) {
		update();
	    });
    
    return function(junctions, newJunctions) {
	var arc = d3.svg.arc()
		.innerRadius(junctionRadius)
		.outerRadius(dependencyArcRadius),
	    pie = d3.layout.pie()
		.sort(null)
		.value(function(d, i) {
		    return d.value;
		});

	var dependenceArc = junctions.selectAll("path")
		.data(
		    function(d, i) {
			var dependence = d.collapsed ? 0 : d.dependence,
			    independence = 1 - dependence;

			return pie([
			    {type: "dependence", color: "black", node: d, value: dependence},
			    {type: "independence", color: "white", node: d, value: independence}
			]);
		    },
		    function(d, i) {
			return d.data.type;
		    }
		);
	
	dependenceArc.exit().remove();
	dependenceArc.enter()
	    .append("path")
	    .attr("fill", function(d, i){
		return d.data.color;
	    })
	    .attr("stroke-width", 0.4)
	    .call(dragDependency);

	dependenceArc
	    .attr("d", arc)
	    .style("visibility", function(d, i) {
		return d.data.node.detail ? "visible" : "hidden";
	    });

	junctions.call(onScroll, function(d, i, change) {
	    var node = getNodeCollection()
		    .get(d.id);

	    node.dependence(d.dependence + change);

	    update();
	});
    };
};
