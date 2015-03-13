"use strict";

/*global module, require*/

var d3 = require("d3"),
    svgEditableText = require("../svg-editable-text.js"),
    empty = d3.select();

module.exports = function(container, transitions, toolbar, clickHandler, update) {
    var types = d3.map(),

	filterByType = function(nodeSelection, type) {
	    return nodeSelection.filter(function(d, i) {
		return d.type === type;
	    });
	},

	drawURLLink = function(nodes, newNodes) {
	    var newG = newNodes.append("g")
		    .classed("node-link", true)
		    .attr("transform", "translate(0,15)");
	    
	    newG.append("a")
		.append("text")
		.attr("y", 15)
		.attr("x", 2)
		.text("⌖");
	    

	    var g = nodes.selectAll(".node-link")
		    .style("visibility", function(d, i) {
			return d.name().slice(0, 4).toLowerCase() === "http" ? "visible" : "hidden";
		    });
	    
	    g.selectAll("a")
		.attr("xlink:href", function(d, i) {
		    return d.name();
		});
	},

	drawMoveHandle = function(nodes, newNodes) {
	    var tryDrag = function(g, c) {
		var target = document.elementFromPoint(
		    d3.event.sourceEvent.clientX, 
		    d3.event.sourceEvent.clientY
		);

		if (target && target.tagName.toLowerCase() === "input") {
		    // Inside a text input

		} else if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.button === 2) {
		    // Right-mouse button
		    d3.event.sourceEvent.preventDefault();
		    d3.event.sourceEvent.stopPropagation();
		    
		} else {
		    c(g);
		}
	    },

		dragNode = d3.behavior.drag()
		    .origin(function(d){
			return {
			    x: d.x,
			    y: d.y
			};
		    })
		    .on("dragstart", function(d){
			tryDrag(
			    d3.select(this),
			    function(g) {
				d3.event.sourceEvent.stopPropagation();
				transitions.enabled(false);
			    }
			);
		    })
		    .on("drag", function(d){
			tryDrag(
			    d3.select(this),
			    function(g) {
				var x = d3.event.x,
				    y = d3.event.y;

				d.position([x, y]);
				drawNodes(g, empty);
			    }
			);
		    })
		    .on("dragend", function(d) {
			update();			
			transitions.enabled(true);
		    });

	    newNodes.call(dragNode);
	    
	    newNodes.on("contextmenu", function(d, i){
		d3.event.stopPropagation();
		d3.event.preventDefault();
		d.autoPosition();
		update();
	    });
	},

	dragResize = d3.behavior.drag()
    	    .origin(function(d){
		return {
		    x: d.size()[0],
		    y: d.size()[1]
		};
	    })
	    .on("dragstart", function(d){
		d3.event.sourceEvent.stopPropagation();
		transitions.enabled(false);
	    })
	    .on("drag", function(d){
		var x = d3.event.x,
		    y = d3.event.y;
		
		d.size([x, y]);
		drawNodes(
		    d3.select(this.parentElement),
		    empty
		);
		
	    })
	    .on("dragend", function(d) {
		update();		
		transitions.enabled(true);
	    }),

	drawResizeHandle = function(nodes, newNodes) {
	    newNodes.append("g")
		.classed("resize-handle", true)
		.on("click", function(d, i) {
		    if (!d3.event.defaultPrevented) {

			var thing = 			    
			    d3.select(this.parentNode)
				.select(".node-description")
				.node();

			/*
			 Resize my node to fit the description box.
			 */
			d.size([
			    d.size()[0],
			    
			    d3.select(this.parentNode)
				.select(".node-description")
				.node()
				.scrollHeight + 45
			]);
			update();
		    }
		})
		.call(dragResize)
		.append("text")
		.text("⇘");

	    nodes.selectAll("g.resize-handle")
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size()[0] - 8) + "," + (d.size()[1] - 0.5) + ")";
		});

	},

	drawNodeName = function(nodes, newNodes) {
	    var newNameGroups = newNodes.append("g")
		    .classed("name", true)
		    .attr("transform", "translate(20, 5)");

	    var nameGroups = nodes.selectAll("g.name");

	    svgEditableText(
		nameGroups,
		newNameGroups,
		0,
		0, 
		function(d, i) {
		    return (d.size()[0] - 35);
		},
		21,
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
		toolbar,
		true
	    );
	};

    var drawNodeDescription = function(nodes, newNodes) {
	var newDescriptionGroups = newNodes.append("g")
		.classed("description", true)
		.attr("transform", "translate(20, 26)");

	var descriptionGroups = nodes.selectAll("g.description");

	svgEditableText(
	    descriptionGroups,
	    newDescriptionGroups,
	    0,
	    0, 
	    function(d, i) {
		return (d.size()[0] - 35);
	    },
	    function(d, i) {
		return (d.size()[1] - 40);
	    },
	    "node-description",
	    function content(d, i) {
		return d.description();
	    },
	    function onChange(d, i, val) {
		d.description(val);
	    },
	    toolbar,
	    false
	);
    },

	drawExpandContract = function(g) {
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
	},

	closeEnough = function(bbox, x, y) {
	    return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
		(bbox.y >= y || (bbox.y + bbox.height) <= y);
	},

	drawNodeType = function(displayNodes, newNodes) {
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
	},

	drawNodes = function(nodes, newNodes) {
	    newNodes
		.append("rect")
		.classed("node-box", true)
		.each(function(d, i) {
		    d3.select(this).classed("node-box-" + d.type, true);
		})
		.on("click", function(d, i) {
		    clickHandler(d);
		});

	    nodes
		.classed("selected", function(d, i) {
		    return d.selected;
		})
		.selectAll("rect.node-box")
		.attr("width", function(d, i) {
		    return d.size()[0] + "px";
		})
		.attr("height", function(d, i) {
		    return d.size()[1] + "px";
		});

	    drawNodeName(nodes, newNodes);
	    drawNodeDescription(nodes, newNodes);

	    transitions.maybeTransition(nodes).attr("transform", function(d, i){
		return "translate(" + (d.x) + "," + d.y + ")";
	    });
	    
	    drawExpandContract(nodes);
	    drawURLLink(nodes, newNodes);

	    drawMoveHandle(nodes, newNodes);
	    drawResizeHandle(nodes, newNodes);

	    drawNodeType(nodes, newNodes);

	    types.entries().forEach(function(e) {
		e.value(
		    filterByType(newNodes, e.key),
		    filterByType(nodes, e.key)
		);
	    });
	};

    return {
	registerType: function(key, value) {
	    types.set(key, value);
	},

	redrawNode: function(nodeSelection) {
	    drawNodes(nodeSelection, empty);
	},
	
	draw: function(nodeData) {
	    var nodes = container.selectAll("g.process-node")
		    .data(
			nodeData,
			function(d, i){
			    return d.id;
			}
		    );

	    var newNodes = nodes.enter()
		    .append("g")
		    .classed("process-node", true);

	    transitions.fadeOut(nodes);	    

	    drawNodes(nodes, newNodes);
	}
    };
    
};
