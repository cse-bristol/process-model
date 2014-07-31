"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.DrawNodeTypes = function(drawNodes, trackAllowedTypes, nodes, update) {
    var junctionRadius = 5;

    var findDragTarget = function() {
	var target = document.elementFromPoint(
	    d3.event.sourceEvent.clientX, 
	    d3.event.sourceEvent.clientY);
	while (target.parentNode) {
	    var targetSelection = d3.select(target);
	    if (targetSelection.classed("process-node")) {
		return targetSelection;
	    } else {
		target = target.parentNode;
	    }
	}
	return null;
    };

    var dragNode = d3.behavior.drag()
	    .on("dragstart", function(d){
		/* Nothing else should get this click now. */
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d){
		/* Highlight things we're dragging over to aid the user. */
		var target = findDragTarget();
		if (target === d.previousDragTarget) {
		    return;
		} else {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		    if (target) {
			target.classed("drag-target", true);
		    }
		    d.previousDragTarget = target;
		}
	    })
	    .on("dragend", function(d, i){
		/* See if we're over an existing different node. 
		 If so, make an edge to it.
		 Otherwise, we'll make an edge to a new node. */
		var oldNode = d,
		    target = findDragTarget(),
		    newNode;

		if (target && target.datum().name() !== oldNode.name()) {
		    newNode = target.datum();
		} else {
		    if (oldNode.allowedChildren.empty()) {
			throw new Error("Nodes of type " + oldNode.type + " cannot have children.");
		    }
		    if (oldNode.allowedChildren.values().length === 1) {
			newNode = nodes.create(oldNode.allowedChildren.values()[0]);
		    } else {
			newNode = nodes.create('undecided');
		    };
		}

		try {
		    if (oldNode.collapsed()) {
			return;
		    }
		    oldNode.edgeTo(newNode); 
		    update();
		} finally {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		}
	    });

    var drawEdgeJunctionGroup = function(nodes) {
	var junctions = nodes
		.selectAll("g.handle")
		.data(function(d, i){
		    return [d];
		});

	junctions.exit().remove();

	junctions.enter()
	    .append("g")
	    .classed("handle", true)
	    .attr("transform", "translate(" + drawNodes.nodeWidth + "," + drawNodes.nodeCenter[1] + ")")
	    .attr("draggable", true)
	    .call(dragNode);

	junctions.style("visibility", function(d, i){
	    return d.collapsed() ? "hidden" : "visible";
	});

	return junctions;
    };

    var drawSimpleJunction = function(junctions) {
	junctions.append("circle")
	    .attr("r", junctionRadius);
    };

    var drawDependencyArc = function(junctions) {
	var arc = d3.svg.arc()
		.outerRadius(junctionRadius),
	    pie = d3.layout.pie()
		.sort(null)
		.value(function(d, i){
		    return d.value;
		});

	var dependenceArc = junctions.selectAll("path")
		.data(function(d, i){
		    var dependence = d.collapsed() || d.isLeaf() ? 0 : d.dependence(),
			independence = 1 - dependence;
		    
		    return pie([
			{type: "dependence", color: "black", node: d, value: dependence},
			{type: "independence", color: "white", node: d, value: independence}
		    ]);
		});
	
	dependenceArc.exit().remove();
	dependenceArc.enter()
	    .append("path")
	    .attr("fill", function(d, i){
		return d.data.color;
	    })
	    .attr("stroke-width", 0.4)
	    .call(ProcessModel.Util.onScroll, function(d, i, change){
		var toChange = d.data.node;

		if(toChange.isLeaf() || toChange.collapsed()) {
		    return;
		}

		switch(d.data.type) {
		case "dependence":
		case "independence":
		    toChange.dependence(toChange.dependence() + change);
		    break;
		}

		update();
	    });

	dependenceArc
	    .attr("d", arc);
    };

    ProcessModel.DrawNodes.types.set("undecided", function(newNodes, nodeDisplay) {
	newNodes.append("g")
	    .classed("change-node-type", true);

	var typeOptions = nodeDisplay.selectAll("g.change-node-type g.node-type-option")
	.data(function(d, i) {
	    return trackAllowedTypes.allowedTypesForNode(d.name())
		    .values()
		    .map(function(option) {
			return {node: d, option: option};
		    });
	});

	typeOptions.exit().remove();

	var newOptions = typeOptions.enter().append("g")
	    .classed("node-type-option", true)
		.attr("transform", function(d, i) {
		    return "translate(" + (5 + (i * 25)) + "," + drawNodes.nodeCenter[1] + ")";
		})
		.on("click", function(d, i) {
		    var replacement = nodes.create(d.option),
			name = d.node.name();
		    
		    d.node.incomingEdges().forEach(function(e) {
			e.parent().edgeTo(replacement);
			e.disconnect();
		    });

		    replacement.name(name);
		    update();
		});

	newOptions.append("rect")
	    .attr("width", 20)
	    .attr("height", 20);


	newOptions.append("text")
	    .attr("y", 15)
	    .attr("x", 5)
	    .text(function(d, i) {
		return d.option[0].toUpperCase();
	    });
    });

    ProcessModel.DrawNodes.types.set("process", function(newNodes, nodeDisplay) {
	var drawIntervalParts = function(g) {
	    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
	    var parts = g.selectAll("rect")
    		    .data(function(d, i){
			var p = d.p(),
			    lower = Math.min(p[0], p[1]),
			    upper = Math.max(p[0], p[1]),
			    conflict = p[0] > p[1],
			    gap = upper - lower;
			return [
			    {node: d, type: "failure", width: lower, x: 0},
			    {node: d, type: "conflict", width: conflict ? gap : 0, x: lower},
			    {node: d, type: "uncertainty", width: conflict ? 0 : gap, x: lower},
			    {node: d, type: "success", width: 1 - upper, x: upper}
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
		    return (drawNodes.nodeSidePadding + (drawNodes.nodeInnerWidth * d.x)) + "px";
		})
		.attr("width", function(d, i){
		    return (drawNodes.nodeInnerWidth * d.width) + "px";
		});

	    parts.call(ProcessModel.Util.onScroll, function(d, i, change){
		if (!d.node.isLeaf() || d.node.collapsed()) {
		    return;
		}

		var newEvidence = d.node.localEvidence();
		
		switch(d.type) {
		case "failure":
		    newEvidence[0] += change;
		    break;

		case "uncertainty":
		    newEvidence[0] -= change / 2;
		    newEvidence[1] += change / 2;
		    break;
		    
		case "success":
		    newEvidence[1] -= change;
		}

		d.node.localEvidence(newEvidence);
		update();
	    });
	};

	drawIntervalParts(nodeDisplay.selectAll("g.interval"));
	var junctions = drawEdgeJunctionGroup(nodeDisplay);
	drawDependencyArc(junctions);
    });

    ProcessModel.DrawNodes.types.set("issue", function(newNodes, nodeDisplay) {
	var junctions = drawEdgeJunctionGroup(nodeDisplay);
	drawSimpleJunction(junctions);
	// TODO settled
    });

    ProcessModel.DrawNodes.types.set("option", function(newNodes, nodeDisplay) {
	var junctions = drawEdgeJunctionGroup(nodeDisplay);
	drawSimpleJunction(junctions);
    });

    ProcessModel.DrawNodes.types.set("argument", function(newNodes, nodeDisplay) {
	// TODO support/refute
    });
};