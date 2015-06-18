"use strict";

/*global module, require*/

var d3 = require("d3"),

    helpers = require("../../helpers.js"),
    onScroll = helpers.onScroll,

    // This constant should probably be moved somewhere else.
    magicLeftOffset = 10,
    computedClass = "computed";

module.exports = function(drawJunctions, redrawNode, getNodeCollection, transitions, update) {
    
    var modifyIndex,
	dragEvidence = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
		transitions.disable();
	    })
	    .on("drag", function(d, i) {
		var evidence = d.node.evidence.slice(0),
		    scale = d.node.innerWidth - magicLeftOffset,
		    newWidth = d3.event.x - magicLeftOffset;

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
			    modifyIndex = 0;
			} else {
			    modifyIndex = 1;
			}
			
			break;
		    default:
			throw new Error("Unsupported evidence part: " + d.type);
		    }
		}

		evidence[modifyIndex] = 1 - (newWidth / scale);

		var node = getNodeCollection().get(d.node.id);

		node.localEvidence(evidence);

		d.node.evidence = node.p();

		redrawNode(d3.select(this.parentNode.parentNode.parentNode));
	    })
	    .on("dragend", function(d, i) {
		modifyIndex = undefined;
		transitions.enable();
		update();
	    });

    return function(nodes, newNodes, margins, newMargins) {
	var drawIntervalParts = function(g, newG) {
	    g
		.classed(computedClass, function(d, i) {
		    return d.hasChildProcesses;
		});

	    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
	    var parts = g.selectAll("rect")
    		    .data(
			function(viewNode, i) {
			    var p = viewNode.evidence,
				Sn = Math.min(p[0], p[1]),
				Sp = Math.max(p[0], p[1]),

				// Swap these over so that green is on the left.
				green = 1 - Sp,
				red = 1 - Sn,

				conflict = p[0] > p[1],
				gap = Sp - Sn;


			    var intervalData = [
				{node: viewNode, type: "failure", width: Sn, x: green + gap},
				{node: viewNode, type: "conflict", width: conflict ? gap : 0, x: green},
				{node: viewNode, type: "uncertainty", width: conflict ? 0 : gap, x: green},
				{node: viewNode, type: "success", width: green, x: 0}
			    ];

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
		.attr("height", "15px")	    
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

	    transitions.maybeTransition(parts)
		.attr("x", function(d, i) {
		    return d.node.margin.horizontal + magicLeftOffset + ((d.node.innerWidth - magicLeftOffset) * d.x) + "px";
		})
		.attr("width", function(d, i) {
		    return (d.node.innerWidth - magicLeftOffset) * d.width + "px";
		});
	};

	var newG = newMargins.append("g")
	    .classed("interval", "true");

	drawIntervalParts(margins.select("g.interval"), newG);

	drawJunctions.dependencyArc(nodes, newNodes);
    };
};
