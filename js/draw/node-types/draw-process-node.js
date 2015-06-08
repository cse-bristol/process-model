"use strict";

/*global module, require*/

var d3 = require("d3"),

    helpers = require("../../helpers.js"),
    onScroll = helpers.onScroll, 
    
    computedClass = "computed";

module.exports = function(drawJunctions, redrawNode, getNodeCollection, update) {
    
    var modifyIndex,
	dragEvidence = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d, i) {
		var evidence = d.node.evidence.slice(0),
		    scale = d.node.innerWidth,
		    newWidth = d3.event.x;

		if (modifyIndex === undefined || modifyIndex === null) {
		    switch (d.type) {
		    case "failure":
			modifyIndex = 0;
			break;
		    case "success":
			modifyIndex = 1;
			break;
		    case "uncertainty":
		    case "conflict":			
			/*
			 Choose which bit of evidence to modify based on where the cursor was when we started the drag action.
			 */
			if (d3.event.x > this.x.baseVal.value + (this.width.baseVal.value / 2)) {
			    modifyIndex = 1;
			} else {
			    modifyIndex = 0;
			}
			
			break;
		    default:
			throw new Error("Unsupported evidence part: " + d.type);
		    }
		}

		evidence[modifyIndex] = newWidth / scale;

		var node = getNodeCollection().get(d.node.id);

		node.localEvidence(evidence);

		d.node.evidence = node.p();

		redrawNode(d3.select(this.parentNode.parentNode.parentNode));
	    })
	    .on("dragend", function(d, i) {
		modifyIndex = undefined;
		update();
	    });

    return function(nodes, newNodes, margins, newMargins) {
	var drawIntervalParts = function(g) {
	    g
		.attr("transform", function(d, i) {
		    return "rotate(180," +  (d.size[0] / 2) + ", 0)translate(0," + (-d.margin.vertical) + ")";
		})
		.classed(computedClass, function(d, i) {
		    return d.hasChildProcesses;
		});


	    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
	    var parts = g.selectAll("rect")
    		    .data(
			function(viewNode, i) {
			    var p = viewNode.evidence,
				lower = Math.min(p[0], p[1]),
				upper = Math.max(p[0], p[1]),
				conflict = p[0] > p[1],
				gap = upper - lower;


			    var intervalData = [
				{node: viewNode, type: "failure", width: lower, x: 0},
				{node: viewNode, type: "conflict", width: conflict ? gap : 0, x: lower},
				{node: viewNode, type: "uncertainty", width: conflict ? 0 : gap, x: lower},
				{node: viewNode, type: "success", width: 1 - upper, x: upper}
			    ];

			    intervalData.forEach(function(d) {
				d.nodeInnerWidth = viewNode.innerWidth;
				d.nodeSidePadding = viewNode.sidePadding;
			    });

			    return intervalData;
			},
			function(d, i) {
			    return d.node.id + "/" + d.type;
			}
		    );

	    parts.enter()
		.append("rect")
		.call(dragEvidence)
	    	.attr("class", function(d, i) {
		    return d.type;
		})
		.call(onScroll, function(d, i, change) {
		    var evidence = d.node.evidence;
		    
		    switch(d.type) {
		    case "failure":
			evidence[0] += change;
			break;

		    case "uncertainty":
		    case "conflict":
			evidence[0] -= change / 2;
			evidence[1] += change / 2;
			break;
			
		    case "success":
			evidence[1] -= change;
		    }

		    var node = getNodeCollection().get(d.node.id);
		    node.localEvidence(evidence);
		    d.node.evidence = node.localEvidence();

		    update();
		});	    

	    parts
		.attr("x", function(d, i) {
		    return (d.node.size[0] * d.x) + "px";
		})
		.attr("height", function(d, i) {
		    return d.node.margin.vertical + "px";
		})
		.attr("width", function(d, i) {
		    return (d.node.size[0] * d.width) + "px";
		});
	};

	newMargins.append("g")
	    .classed("interval", "true");

	drawIntervalParts(margins.select("g.interval"));

	drawJunctions.dependencyArc(nodes, newNodes);
    };
};
