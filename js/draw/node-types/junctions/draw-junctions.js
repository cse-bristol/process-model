"use strict";

/*global module, require*/

var d3 = require("d3"),
    drawSimpleJunctionFactory = require("./draw-simple-junction.js"),
    drawDependencyArcFactory = require("./draw-dependency-arc.js"),
    
    junctionRadius = 5;

module.exports = function(container, transitions, redrawNode, getNodeCollection, getLayoutState, update) {
    var simpleJunction = drawSimpleJunctionFactory(container, junctionRadius, getNodeCollection, getLayoutState, update),
	dependencyArc = drawDependencyArcFactory(redrawNode, junctionRadius, getNodeCollection, update),
	
	drawEdgeJunctionGroup = function(nodes, newNodes) {
	    var newJunctions = newNodes
		    .append("g")
		    .classed("handle", true)
		    .attr("draggable", true);

	    var junctions = nodes.select("g.handle");

	    transitions.maybeTransition(junctions)
		.style("visibility", function(d, i) {
		    return d.collapsed ? "hidden" : "visible";
		})
		.attr("transform", function(d, i) {
		    return "translate(" + d.junctionOffset[0] + "," + d.junctionOffset[1] + ")";
		});

	    return {
		junctions: junctions,
		newJunctions: newJunctions
	    };
	};
    
    return {
	simple: function(nodes, newNodes) {
	    var junctions = drawEdgeJunctionGroup(nodes, newNodes);

	    simpleJunction(junctions.junctions, junctions.newJunctions);
	},

	dependencyArc: function(nodes, newNodes) {
	    var junctions = drawEdgeJunctionGroup(nodes, newNodes);

	    simpleJunction(junctions.junctions, junctions.newJunctions);
	    dependencyArc(junctions.junctions, junctions.newJunctions);
	}
    };
};
