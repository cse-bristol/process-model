"use strict";

/*global d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var nodes = ProcessModel.Nodes();

var rootNode = nodes.create("Model")
	.description("The root node of our model, as a process.")
	.localEvidence([0.25, 0.75]);

var joinedNode = nodes.create("Child process")
	.localEvidence([0.1, 0.9]);

rootNode.addEdge(joinedNode);

var zoom = d3.behavior.zoom()
	.scaleExtent([0.1, 10])
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

zoom(svg);

var nodeHeight = 50,
    nodeWidth = 150,
    nodeSidePadding = 10,
    nodeInnerWidth = nodeWidth - (2 * nodeSidePadding),
    nodeCenter = [nodeWidth / 2 , nodeHeight / 2];

var drawIntervalParts = function(g) {
    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
    var parts = g.selectAll("rect")
    	    .data(function(d, i){
		var p = d.p();
		return [
		    {node: d, type: "failure", width: p[0], x: 0},
		    {node: d, type: "uncertainty", width: p[1] - p[0], x: p[0]},
		    {node: d, type: "success", width: 1 - p[1], x: p[1]}
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
	    return (nodeSidePadding + (nodeInnerWidth * d.x)) + "px";
	})
	.attr("width", function(d, i){
	    return (nodeInnerWidth * d.width) + "px";
	});

    parts.call(ProcessModel.Util.onScroll, function(d, i, change){
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

var drawPathsForEdges = function(edgeGroups) {
    var colourScale = d3.scale.linear()
	    .domain([-1, 1])
	    .range(["darkred", "darkgreen"])
	    .interpolate(d3.interpolateLab);


    var edgePaths = edgeGroups.selectAll("path")
	    .data(function(d, i){
		return [d];
	    });

    edgePaths.exit().remove();

    edgePaths.enter()
	.append("path")
	.attr("stroke", function(d, i){
	    return colourScale(d.sufficiency() - d.necessity());
	})
	.attr("stroke-width", function(d, i){
	    return d.necessity() + d.sufficiency();
	})
	.attr("fill", "none");

    edgePaths.attr("d", function(d, i){
	return d3.svg.line().interpolate("basis")(d.path, i);
    });
};

var drawEndsForEdges = function(edgeGroups) {
    var edgeEnds = edgeGroups.selectAll("circle")
	    .data(function(d, i){
		return [d];
	    });

    edgeEnds.exit().remove();

    edgeEnds.enter()
	.append("circle")
	.attr("r", "2px");

    edgeEnds     
	.attr("cx", function(d, i){
	    return d.path[d.path.length - 1][0];
	})
	.attr("cy", function(d, i){
	    return d.path[d.path.length - 1][1];
	})
	.on("click", function(d, i){
	    d.disconnect(rootNode);
	    update();
	});
};

var drawNecessitySufficiency = function(groups, position) {
    var circleR = 3,
	arc = d3.svg.arc()
	    .outerRadius(circleR),
	pie = d3.layout.pie()
	    .sort(null)
	    .value(function(d, i){
		return d.value;
	    }),
	weights = groups.selectAll("g.weights")
	    .data(function(d, i){
		return [d];
	    });

    weights.exit().remove();
    weights.enter().append("g")
	.classed("weights", true)
	.attr("width", circleR * 2)
	.attr("height", circleR * 2);

    weights
	.attr("transform", position);

    var weightHalfs = weights.selectAll("g.weight-half")
	    .data(function(d, i){
		var pieData = pie([
		    {type: "necessity", color: "red", target: d, value: d.necessity()},
		    {type: "anti-necessity", color: "lightgray", target: d, value: 1 - d.necessity()},
		    {type: "anti-sufficiency", color: "lightgray", target: d, value: 1 - d.sufficiency()},
		    {type: "sufficiency", color: "green", target: d, value: d.sufficiency()}
		]);

		return [
		    [pieData[0], pieData[1]],
		    [pieData[2], pieData[3]]
		];
	    });

    weightHalfs.exit().remove();
    weightHalfs.enter()
	.append("g")
	.classed("weight-half", true);

    var weightingsPath = weightHalfs.selectAll("path")
	    .data(function(d, i){
		return d;
	    });

    weightingsPath.exit().remove();
    weightingsPath.enter()
	.append("path")
	.attr("fill", function(d, i){
	    return d.data.color;
	})
	.call(ProcessModel.Util.onScroll, function(d, i, change){
	    var toChange = d.data.target;

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
	});

    weightingsPath
	.attr("d", arc);
};

var markNecessitySufficiencyForEdges = function(edgeGroups) {
    drawNecessitySufficiency(
	edgeGroups, 
	function(d, i){
	    return "translate(" + d.path[1][0] + "," + d.path[1][1] + ")";
	});
};

var draw = function() {
    var layout = ProcessModel.Layout(rootNode, nodeWidth, nodeHeight);
    
    var nodeDisplay = g.selectAll("g.process-node")
	    .data(layout.nodes, function(d, i){
		return d.name();
	    });

    nodeDisplay.exit().transition()
	.style("opacity", 0.0001)
	.remove();

    var newNodes = nodeDisplay.enter()
	    .append("g")
	    .classed("process-node", true);

    newNodes
	.append("rect")
	.attr("width", nodeWidth + "px")
	.attr("height", nodeHeight + "px");

    ProcessModel.svgEditableText(
	newNodes,
	10,
	5, 
	nodeWidth - 10,
	21, 
	"node-name",
	function(d, i){
	    try {
		d.name(this.value);
		d3.select(this).classed("name-error", false);
	    } catch (err) {
		d3.select(this).classed("name-error", true);
	    }
	});
    
    var closeEnough = function(bbox, x, y) {
	return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
	    (bbox.y >= y || (bbox.y + bbox.height) <= y);
    };

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
		    newNode = (target && target.datum() != oldNode) ? target.datum() : nodes.create();
		
		try {
		    oldNode.addEdge(newNode); 
		} finally {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		}
		update();
	    });

    newNodes
	.append("circle")
	.classed("handle", true)
	.attr("cy", nodeHeight + "px")
	.attr("cx", nodeCenter[0] + "px")
	.attr("r", "5px")
	.attr("draggable", true)
	.call(dragNode);

    nodeDisplay.transition().attr("transform", function(d, i){
	return "translate(" + (d.x - nodeCenter[0]) + "," + d.y + ")";
    });

    nodeDisplay.selectAll(".node-name")
	.attr("value", function(d, i){
	    return d.name();
	});

    newNodes.append("g")
	.classed("interval", "true")
	.attr("transform", "rotate(180, 75, 0)translate(0,-45)");

    drawIntervalParts(nodeDisplay.select("g.interval"));
    
    var edges = g.selectAll("g.edge")
	    .data(layout.edges);

    edges.exit().remove();

    edges.enter()
	.append("g")
	.classed("edge", true);

    drawPathsForEdges(edges);
    markNecessitySufficiencyForEdges(edges);
    drawEndsForEdges(edges);
};

var updateDownloadLink = function(){
    d3.select("#download")
	.attr("download", function(d, i){
	    return rootNode.name() + ".json";
	})
	.attr("href", function(d, i){
	    return "data:application/json," + encodeURIComponent(ProcessModel.Data(nodes).serialize(rootNode));
	});
};

ProcessModel.Files.drop(svg, function(fileName, content){
    nodes = ProcessModel.Nodes();
    rootNode = ProcessModel.Data(nodes).deserialize(content);
    update();
});

var update = function() {
    draw();
    updateDownloadLink();
};

update();
