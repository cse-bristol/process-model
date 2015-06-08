"use strict";

/*global module, require*/

var d3 = require("d3"),
    edgePath = require("../../../layout/edge-path.js");

module.exports = function(container, junctionRadius, getNodeCollection, getLayoutState, update) {
    var tempEdgeId = "temporary-edge",
	
	findDragTarget = function() {
	    var target = document.elementFromPoint(
		d3.event.sourceEvent.clientX, 
		d3.event.sourceEvent.clientY);

	    while (target && target.parentNode) {
		var targetSelection = d3.select(target);
		if (targetSelection.classed("process-node")) {
		    return targetSelection;
		} else {
		    target = target.parentNode;
		}
	    }
	    return null;
	},
	
	dragNode = d3.behavior.drag()
	    .origin(function(d, i) {
		return {
		    x: d.edgeJunction[0],
		    y: d.edgeJunction[1]
		};
	    })    
	    .on("dragstart", function(d) {
		/* Nothing else should get this click now. */
		d3.event.sourceEvent.stopPropagation();

		container.select("#" + tempEdgeId).remove();
		container.append("path")
		    .attr("id", tempEdgeId);
	    })
	    .on("drag", function(d) {
		var target = findDragTarget(),
		    tempEdge = container.select("#" + tempEdgeId);

		/*
		 Draw a dotted line to indicate where we're dragging to.
		 */
		tempEdge.attr("d", d3.svg.line().interpolate("basis")(
		    edgePath(
			d.edgeJunction,
			target ? target.datum().edgeEnd : [d3.event.x, d3.event.y],
			getLayoutState().getOrientationCoords()
		    )));
		
	    })
	    .on("dragend", function(d, i) {
		/* See if we're over an existing different node. 
		 If so, make an edge to it.
		 Otherwise, we'll make an edge to a new node. */
		var nodes = getNodeCollection(),
		    oldNode = nodes.get(d.id),
		    target = findDragTarget(),
		    newNode;

		d3.select("#" + tempEdgeId).remove();

		if (d.collapsed) {
		    return;
		}

		if (target && target.datum().id !== oldNode.id) {
		    newNode = nodes.get(target.datum().id);
		    
		} else {
		    if (oldNode.allowedChildren.empty()) {
			throw new Error("Nodes of type " + oldNode.type + " cannot have children.");
		    }
		    var newNodeType = oldNode.allowedChildren.values().length === 1 ?
			    oldNode.allowedChildren.values()[0] :
			    "undecided";
		    
		    newNode = nodes.getOrCreateNode(newNodeType);
		}

		oldNode.edgeTo(newNode); 
		update();
	    });

    
    return function(junctions, newJunctions) {
	newJunctions.append("circle")
	    .attr("r", junctionRadius)
	    .call(dragNode);

	junctions.select("circle");
    };
};
