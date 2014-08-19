"use strict";

/*global module, require*/

var d3 = require("d3"),
    svgEditableText = require("../svg-editable-text.js");

module.exports = function(container, transitions, layout, clickHandler, update) {
    var types = d3.map();

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

    var dragResize = d3.behavior.drag()
    	    .origin(function(d){
		return {
		    x: d.size()[0],
		    y: d.size()[1]
		};
	    })
	    .on("dragstart", function(d){
		d3.event.sourceEvent.stopPropagation();
		transitions.enabled(false);
		d3.select(this.parentNode).attr("id", "resizing-node");
	    })
	    .on("drag", function(d){
		var x = d3.event.x,
		    y = d3.event.y;
		
		d.size([x, y]);
		update();
	    })
	    .on("dragend", function(d) {
		transitions.enabled(true);
		d3.select("#resizing-node").attr("id", null);
	    });

    var drawResizeHandle = function(nodes, newNodes) {
	newNodes.append("g")
	    .classed("resize-handle", true)
	    .call(dragResize)
	    .append("text")
	    .text("⇲");

	nodes.selectAll("g.resize-handle")
	    .attr("transform", function(d, i) {
		return "translate(" + (d.size()[0] - 8) + "," + (d.size()[1] - 0.5) + ")";
	    });

    };

    var drawNodeName = function(nodes, newNodes) {
	var foreignObjectSupported = document.implementation.hasFeature("w3.org/TR/SVG11/feature#Extensibility","1.1"),
	    newNameGroups = newNodes.append("g")
		.classed("name", true)
		.attr("transform", "translate(20, 5)");

	newNameGroups.append("a")
	    .append("text")
	    .attr("y", 10);

	var nameGroups = nodes.selectAll("g.name")
		.attr("height", 21);

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

	svgEditableText(
	    nameGroups,
	    newNameGroups,
	    0,
	    0, 
	    function(d, i) {
		return (d.size()[0] - 35);
	    },
	    function(d, i) {
		return (d.size()[1] - 32);
	    }, 
	    "node-name",
	    function content(d, i) {
		return d.name();
	    },
	    function onChange(d, i, val) {
		try {
		    d.name(val);
		    d3.select(this).classed("name-error", false);
		} catch (err) {
		    d3.select(this).classed("name-error", true);
		}
	    },
	    function onLoseFocus(d, i) {
		update();
	    });

	nodes.selectAll(".node-name")
	    .style("visibility", function(d, i){
		return (d.url() && foreignObjectSupported) ? "hidden" : "visible";
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

    var drawNodeType = function(displayNodes, newNodes) {
	newNodes
	    .append("g")
	    .classed("node-type", true)
	    .append("text")
	    .text(function(d, i){
		return d.type[0].toUpperCase();
	    });

	displayNodes.selectAll("g.node-type")
	    .attr("transform", function(d, i) {
		return "translate(" + (d.size()[0] - d.sidePadding() - 2) + "," + 13 + ")";
	    });
    };

    return {
	registerType: function(key, value) {
	    types.set(key, value);
	},
	
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
		.classed("node-box", true)
		.each(function(d, i) {
		    d3.select(this).classed("node-box-" + d.type, true);
		})
		.on("click", function(d, i) {
		    clickHandler(d);
		});

	    nodeDisplay
		.selectAll("rect.node-box")
		.attr("width", function(d, i) {
		    return d.size()[0] + "px";
		})
		.attr("height", function(d, i) {
		    return d.size()[1] + "px";
		});

	    drawNodeName(nodeDisplay, newNodes);

	    transitions.maybeTransition(nodeDisplay).attr("transform", function(d, i){
		return "translate(" + (d.x) + "," + d.y + ")";
	    });
	    
	    drawExpandContract(nodeDisplay);

	    drawMoveHandle(nodeDisplay, newNodes);
	    drawResizeHandle(nodeDisplay, newNodes);

	    drawNodeType(nodeDisplay, newNodes);

	    types.entries().forEach(function(e) {
		e.value(
		    filterByType(newNodes, e.key),
		    filterByType(nodeDisplay, e.key)
		);
	    });
	}
    };
    
};
