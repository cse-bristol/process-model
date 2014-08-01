"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.DrawNodes = function(container, transitions, nodeHeight, nodeWidth, update) {
    var nodeSidePadding = 10,
	nodeInnerWidth = nodeWidth - (2 * nodeSidePadding),
	nodeCenter = [nodeWidth / 2 , nodeHeight / 2];

    var filterByType = function(nodeSelection, type) {
	return nodeSelection.filter(function(d, i) {
	    return d.type === type;
	});
    };

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
			transitions.enabled(false);
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
		    transitions.enabled(true);
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

    var closeEnough = function(bbox, x, y) {
	return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
	    (bbox.y >= y || (bbox.y + bbox.height) <= y);
    };

    var drawNodeType = function(newNodes) {
	newNodes
	    .append("g")
	    .classed("node-type", true)
	    .attr("transform", "translate(" + (nodeWidth - nodeSidePadding - 2) + "," + 13 + ")")
	    .append("text")
	    .text(function(d, i){
		return d.type[0].toUpperCase();
	    });
    };

    return {
	nodeWidth: nodeWidth,
	nodeHeight: nodeHeight,
	nodeSidePadding: nodeSidePadding,
	nodeInnerWidth: nodeInnerWidth,
	nodeCenter: nodeCenter,
	
	draw: function(displayNodes) {
	    var nodeDisplay = container.selectAll("g.process-node")
		    .data(displayNodes, function(d, i){
			return d.type + "/" + d.name();
		    });

	    transitions.fadeOut(nodeDisplay);

	    var newNodes = nodeDisplay.enter()
		    .append("g")
		    .classed("process-node", true);

	    newNodes
		.append("rect")
		.attr("width", nodeWidth + "px")
		.attr("height", nodeHeight + "px")
		.each(function(d, i) {
			d3.select(this).classed("node-box-" + d.type, true);
		    });

	    drawNodeName(nodeDisplay, newNodes);

	    transitions.maybeTransition(nodeDisplay).attr("transform", function(d, i){
		return "translate(" + (d.x - nodeCenter[0]) + "," + d.y + ")";
	    });

	    newNodes.append("g")
		.classed("interval", "true")
		.attr("transform", "rotate(180, 75, 0)translate(0,-45)");

	    
	    drawExpandContract(nodeDisplay);

	    drawMoveHandle(nodeDisplay, newNodes);

	    drawNodeType(newNodes);

	    ProcessModel.DrawNodes.types.entries().forEach(function(e) {
		e.value(
		    filterByType(newNodes, e.key),
		    filterByType(nodeDisplay, e.key)
		);
	    });
	}
    };
    
};

ProcessModel.DrawNodes.types = d3.map();