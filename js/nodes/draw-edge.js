"use strict";

/*global require, module*/

var d3 = require("d3"),
    onScroll = require("../helpers.js").onScroll,
    empty = d3.select(),
    circleFraction = require("../circle-fraction.js"),
    labelSize = 10,
    endSize = 3;

module.exports = function(container, getNodeCollection, transitions, update) {
    var circle,
	dragNecessitySufficiency = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
		circle = this.parentNode.parentNode;
	    })
	    .on("drag", function(d, i) {
		var nodes = getNodeCollection(),
		    toChange = nodes.get(d.data.target.parentId)
			.edgeTo(nodes.get(d.data.target.childId)),
		    fraction = circleFraction(circle, d3.event);

		/*
		 Scale the fraction up by two because we're working with hemicircles instead of circles.

		 Handle the two quadrants of the circle which are outside our current arc.
		 */
		switch (d.data.type) {
		case "necessity":
		case "anti-necessity":
		    if (fraction < 0.25) {
			fraction = 0;
		    } else if (fraction < 0.5) {
			fraction = 1;
		    } else {
			// Flip the direction - necessity increases as we go clockwise.
			fraction = 2 * (1 - fraction);
		    }

		    toChange.necessity(fraction);
		    d.data.target.necessity = toChange.necessity();	    
		    break;
		case "sufficiency":
		case "anti-sufficiency":
		    if (fraction > 0.75) {
			fraction = 0;
		    } else if (fraction > 0.5) {
			fraction = 1;
		    } else {
			fraction *= 2;
		    }

		    toChange.sufficiency(fraction);
		    d.data.target.sufficiency = toChange.sufficiency();		    
		    break;
		default:
		    throw new Error("Unknown type of necessity/sufficiency circle segment: " + d.data.type);
		}

		drawEdges(
		    d3.select(circle.parentNode),
		    empty
		);
	    })
	    .on("dragend", function(d, i) {
		update();
	    });

    var pathColourScale = d3.scale.linear()
	    .domain([-1, 1])
	    .range(["red", "green"])
	    .interpolate(d3.interpolateLab);
    
    var drawPaths = function(edges, newEdges) {
	newEdges.append("path")
	    .classed("edge-path", true)
	    .attr("fill", "none");


	transitions.maybeTransition(
	    edges.select("path.edge-path"))
	    .attr("d", function(d, i) {
		return d3.svg.line().interpolate("basis")(d.path, i);
	    })
	    .attr("stroke-width", function(d, i){
		return d.necessity === undefined ? 1 : d.necessity + d.sufficiency;
	    })
	    .attr("stroke", function(d, i){
		return d.necessity === undefined ? "black" : pathColourScale(d.sufficiency - d.necessity);
	    });
    };

    var drawEnds = function(edges, newEdges) {
	newEdges
	    .append("circle")
	    .classed("edge-end", true)
	    .on("click", function(d, i) {
		if (d.canModify) {
		    var nodes = getNodeCollection(),
			from = nodes.get(d.parentId),
			to = nodes.get(d.childId);
		    
		    from.edgeTo(to).disconnect();
		    update();
		}
	    });

	transitions.maybeTransition(
	    edges.select("circle.edge-end"))
    	    .attr("r", function(d, i) {
		return d.canModify ? endSize : 0;
	    })
	    .attr("cx", function(d, i){
		return d.path[d.path.length - 1][0];
	    })
	    .attr("cy", function(d, i){
		return d.path[d.path.length - 1][1];
	    });
    };

    var drawLabels = function(edges, newEdges) {
	newEdges.append("g")
	    .classed("edge-label", true)
	    .attr("width", labelSize)
	    .attr("height", labelSize);

	var labels = edges.select("g.edge-label");

	transitions.maybeTransition(labels)
		.attr("transform", function(d, i) {
		    return "translate(" + d.path[1][0] + "," + d.path[1][1] + ")";
		});

	drawNecessitySufficiency(labels);
    };

    var necessitySufficiencyArc = d3.svg.arc()
	    .outerRadius(labelSize / 2),
	necessitySufficiencyPie = d3.layout.pie()
	    .sort(null)
	    .value(function(d, i) {
		return d.value;
	    }),

	drawNecessitySufficiency = function(edgeLabels) {
	    var weightHalfs = edgeLabels.selectAll("g.weight-half")
		    .data(
			function(d, i) {
			    if (d.necessity === undefined) {
				return [];
			    }
			    
			    var necessity = d.necessity,
				antiNecessity = 1 - necessity,
				sufficiency = d.sufficiency,
				antiSufficiency = 1 - sufficiency;

			    var pieData = necessitySufficiencyPie([
				{type: "necessity", color: "red", target: d, value: necessity},
				{type: "anti-necessity", color: "lightgray", target: d, value: antiNecessity},
				{type: "anti-sufficiency", color: "lightgray", target: d, value: antiSufficiency},
				{type: "sufficiency", color: "green", target: d, value: sufficiency}
			    ]),

				necessityHalf = [pieData[0], pieData[1]],
				sufficiencyHalf = [pieData[2], pieData[3]];

			    necessityHalf.target = d;
			    necessityHalf.type = 'necessity';
			    sufficiencyHalf.target = d;
			    sufficiencyHalf.type = 'sufficiency';

			    return [necessityHalf, sufficiencyHalf];
			}, function(d, i) {
			    return d.type;
			}
		    );

	    weightHalfs.exit().remove();
	    weightHalfs.enter()
		.append("g")
		.classed("weight-half", true);

	    var weightingsPath = weightHalfs.selectAll("path")
		    .data(
			function(d, i) {
			    return d;
			},
			function(d, i) {
			    return d.data.type;
			}
		    );

	    weightingsPath.exit().remove();
	    weightingsPath.enter()
		.append("path")
		.attr("fill", function(d, i) {
		    return d.data.color;
		})
		.call(onScroll, function(d, i, change) {
		    var nodes = getNodeCollection(),
			toChange = nodes.get(d.data.target.parentId)
			    .edgeTo(nodes.get(d.data.target.childId));

		    switch(d.data.type) {
		    case "necessity":
		    case "anti-necessity":
			toChange.necessity(toChange.necessity() + change);
			break;

		    case "sufficiency":
		    case "anti-sufficiency":
			toChange.sufficiency(toChange.sufficiency() + change);
			break;
		    }

		    update();
		})
		.call(dragNecessitySufficiency);	

	    weightingsPath
		.attr("d", necessitySufficiencyArc);
	};

    var drawEdges = function(edges, newEdges) {
	var newEdgeGroups = newEdges
		.append("g")
		.classed("edge", true);

	drawPaths(edges, newEdgeGroups);
	drawEnds(edges, newEdgeGroups);
	drawLabels(edges, newEdgeGroups);	
    };

    return {
	draw: function(edgeData) {
	    var edges = container.selectAll("g.edge")
		    .data(
			edgeData,
			function(d, i) {
			    return d.parentId + "-to-" + d.childId;
			}
		    );

	    edges.exit().remove();

	    drawEdges(edges, edges.enter());
	}
    };
};
