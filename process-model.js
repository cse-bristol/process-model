"use strict";

/*global parent, d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var nodes = ProcessModel.Nodes();

var zoom = d3.behavior.zoom()
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

var dragging = false;
var maybeTransition = function(selection) {
    if (dragging) {
	return selection;
    } else {
	return selection.transition();
    };
};

zoom(svg);

var nodeHeight = 50,
    nodeWidth = 150,
    nodeSidePadding = 10,
    nodeInnerWidth = nodeWidth - (2 * nodeSidePadding),
    nodeCenter = [nodeWidth / 2 , nodeHeight / 2];

var layout = ProcessModel.Layout(nodes, nodeWidth, nodeHeight);

var drawMoveHandle = function(nodes, newNodes) {
    var ifNotTextInput = function(c) {
	var target = document.elementFromPoint(
	    d3.event.sourceEvent.clientX, 
	    d3.event.sourceEvent.clientY);

	if (!target || target.tagName.toLowerCase() !== "input") {
	    c();
	}
    };

    var dragNode = d3.behavior.drag()
	    .origin(function(d){
		return {
		    x: d.x,
		    y: d.y
		};
	    })
	    .on("dragstart", function(d){
		ifNotTextInput(function(){
		    d3.event.sourceEvent.stopPropagation();
		    dragging = true;
		});
	    })
	    .on("drag", function(d){
		ifNotTextInput(function(){
		    var x = d3.event.x,
			y = d3.event.y;

		    d.position([x, y]);
		    update();
		});
	    })
	    .on("dragend", function(d){
		dragging = false;
	    });

    newNodes.call(dragNode);
    
    newNodes.on("contextmenu", function(d, i){
	d3.event.stopPropagation();
	d3.event.preventDefault();
	d.autoPosition();
	update();
    });
};

var drawNodeName = function(nodes, newNodes) {
    var foreignObjectSupported = document.implementation.hasFeature("w3.org/TR/SVG11/feature#Extensibility","1.1"),
	nameGroups = newNodes.append("g")
	    .classed("name", true)
	    .attr("transform", "translate(20, 5)")
	    .attr("width", nodeWidth - 25)
	    .attr("height", 21);

    nameGroups.append("a")
	.append("text")
	.attr("y", 10)
	.attr("textLength", nodeWidth - 35)
    .attr("lengthAdjust", "spacingAndGlyphs");

    nodes.selectAll("g.name a")
        .attr("xlink:href", function(d, i){
	    return d.url();
	})
	.attr("target", "_parent")
	.style("visibility", function(d, i){
	    return (d.url() || !foreignObjectSupported) ? "visible" : "hidden";
	})
	.selectAll("text")
	.text(function(d, i){ 
	    return d.name(); 
	});

    ProcessModel.svgEditableText(
	nameGroups,
	0,
	0, 
	nodeWidth - 35,
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

    nodes.selectAll(".node-name")
	.style("visibility", function(d, i){
	    return (d.url() && foreignObjectSupported) ? "hidden" : "visible";
	})
	.attr("value", function(d, i){
	    return d.name();
	});


};

var drawExpandContract = function(g) {
    var expander = g.selectAll("g.expander")
	.data(function(d, i){
	   return [d]; 
	});

    expander.exit().remove();

    var newG = expander.enter().append("g")
	.classed("expander", true)
    	.on("click", function(d, i){
	    d.collapsed(!d.collapsed());
	    update();
	});
    
    newG
	.append("rect")
	.attr("width", 15)
	.attr("height", 15);

    newG.append("text")
	.attr("x", 7.5)
	.attr("y", 13)
	.attr("width", 15)
	.attr("height", 15)
	.attr("text-anchor", "middle");

    expander.style("visibility", function(d, i){
	return !d.collapsed() && d.isLeaf() ? "hidden" : "visible";
    });

    expander.selectAll("text")
	.data(function(d, i){
	    return [d];
	})
	.text(function(d, i){
	    return d.collapsed() ? "+" : String.fromCharCode("8259");
	});
};

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
	    return (nodeSidePadding + (nodeInnerWidth * d.x)) + "px";
	})
	.attr("width", function(d, i){
	    return (nodeInnerWidth * d.width) + "px";
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

var drawPathsForEdges = function(edgeGroups) {
    var colourScale = d3.scale.linear()
	    .domain([-1, 1])
	    .range(["red", "green"])
	    .interpolate(d3.interpolateLab);


    var edgePaths = edgeGroups.selectAll("path")
	    .data(function(d, i){
		return [d];
	    });

    edgePaths.exit().remove();

    edgePaths.enter()
	.append("path")
	.attr("fill", "none");

    maybeTransition(edgePaths)
	.attr("d", function(d, i){
	    return d3.svg.line().interpolate("basis")(d.path, i);
	})
	.attr("stroke-width", function(d, i){
	    if (!d.canModify()) {
		return 1;
	    }
	    return d.necessity() + d.sufficiency();
	})
	.attr("stroke", function(d, i){
	    if (!d.canModify()) {
		return "black";
	    }
	    return colourScale(d.sufficiency() - d.necessity());
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
	.on("click", function(d, i){
	    if (d.canModify()) {
		d.disconnect();
		update();
	    }
	});
    maybeTransition(edgeEnds)
    	.attr("r", function(d, i){
	    if (d.canModify()) {
		return 2;
	    } else {
		return 0;
	    }
	})
	.attr("cx", function(d, i){
	    return d.path[d.path.length - 1][0];
	})
	.attr("cy", function(d, i){
	    return d.path[d.path.length - 1][1];
	});
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

var edgeJunction = function(nodes) {
    var circleR = 5,
	arc = d3.svg.arc()
	    .outerRadius(circleR),
	pie = d3.layout.pie()
	    .sort(null)
	    .value(function(d, i){
		return d.value;
	    });

    var junctions = nodes
	    .selectAll("g.handle")
	    .data(function(d, i){
		return [d];
	    });

    junctions.exit().remove();

    junctions.enter()
	.append("g")
	.classed("handle", true)
	.attr("transform", "translate(" + nodeWidth + "," + nodeCenter[1] + ")")
	.attr("stroke", "black")
	.attr("width", circleR)
	.attr("height", circleR)
	.attr("draggable", true)
	.call(dragNode);

    junctions.style("visibility", function(d, i){
	return d.collapsed() ? "hidden" : "visible";
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

var drawNecessitySufficiency = function(groups, position) {
    var circleR = 5,
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

    maybeTransition(weights)
	.attr("transform", position)
	.style("visibility", function(d, i){
	    return d.canModify() ? "visible" : "hidden";
	});

    var weightHalfs = weights.selectAll("g.weight-half")
	    .data(function(d, i){
		var necessity = d.canModify() ? d.necessity() : 0,
		    antiNecessity = 1 - necessity,
		    sufficiency = d.canModify() ? d.sufficiency() : 0,
		    antiSufficiency = 1 - sufficiency;

		var pieData = pie([
		    {type: "necessity", color: "red", target: d, value: necessity},
		    {type: "anti-necessity", color: "lightgray", target: d, value: antiNecessity},
		    {type: "anti-sufficiency", color: "lightgray", target: d, value: antiSufficiency},
		    {type: "sufficiency", color: "green", target: d, value: sufficiency}
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

	    if (!toChange.canModify()) {
		return;
	    }

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
    var display = layout.display();
    
    var nodeDisplay = g.selectAll("g.process-node")
	    .data(display.nodes, function(d, i){
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

    drawNodeName(nodeDisplay, newNodes);
    
    var closeEnough = function(bbox, x, y) {
	return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
	    (bbox.y >= y || (bbox.y + bbox.height) <= y);
    };

    maybeTransition(nodeDisplay).attr("transform", function(d, i){
	return "translate(" + (d.x - nodeCenter[0]) + "," + d.y + ")";
    });

    newNodes.append("g")
	.classed("interval", "true")
	.attr("transform", "rotate(180, 75, 0)translate(0,-45)");

    drawIntervalParts(nodeDisplay.select("g.interval"));
    drawExpandContract(nodeDisplay);

    edgeJunction(nodeDisplay);

    drawMoveHandle(nodeDisplay, newNodes);
    
    var edges = g.selectAll("g.edge")
	    .data(display.edges);

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
	    return nodes.root().name() + ".json";
	})
	.attr("href", function(d, i){
	    return "data:application/json," + encodeURIComponent(ProcessModel.Data(nodes, layout).serialize(nodes.root()));
	});
};

var fromJson = function(fileName, content){
    nodes.reset();
    nodes.root(ProcessModel.Data(nodes, layout).deserialize(content));
    update();
};

var fromXML = function(fileName, content) {
    nodes.reset();
    ProcessModel.PerimetaXML(nodes).deserialize(content);
    update();
};

ProcessModel.Files.drop(svg, [fromJson, fromXML]);

var update = function() {
    draw();
    updateDownloadLink();
};

if (parent !== window) {
    /* If we're in an iframe, assume our parent is what we want to scrape. */
    ProcessModel.Scrape(nodes).scrape(document.referrer, update);
} 
if (nodes.root() === null) {
    ProcessModel.Scrape(nodes).scrapeCurrent(update);
}
if (nodes.root() === null) {
    ProcessModel.Scrape(nodes).scrape("table-test.html", update);
}
