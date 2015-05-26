"use strict";

/*global module, require*/

var d3 = require("d3"),
    svgEditableText = require("../svg-editable-text.js"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    empty = d3.select(),
    edgePath = require("../layout/edge-path.js"),
    nodeClass = "process-node";

module.exports = function(container, defs, getNodeCollection, getLayout, transitions, toolbar, drawEdges, update) {
    var types = d3.map(),
	drawNodesHook = callbacks(),

	filterByType = function(nodeSelection, type) {
	    return nodeSelection.filter(function(d, i) {
		return d.type === type;
	    });
	},

	/*
	 Used to tidy up the beginnings of edges.
	*/
	drawJunctionMasks = function(nodeData, keepMissing) {
	    var junctionMasks = defs.selectAll("mask.junction-mask")
		    .data(
			nodeData,
			function(d, i) {
			    return d.id;
			}
		    );

	    if (!keepMissing) {
		junctionMasks.exit().remove();
	    }

	    var newMasks = junctionMasks.enter().append("mask")
		    .classed("junction-mask", true)
		    .attr("id", function(d, i) {
			return "cut-" + d.id;
		    })
	    /*
	     This is some dark magic which controls the size of the buffer we are masking against.

	     See: http://www.w3.org/TR/2003/REC-SVG11-20030114/masking.html
	     */
		    .attr("maskUnits", "userSpaceOnUse")
		    .attr("x", "-50000%")
		    .attr("y", "-50000%")
		    .attr("width", "100000%")
		    .attr("height", "100000%");

	    newMasks.append("circle")
		.classed("background-mask", true)
		.attr("r", 10000)
		.attr("fill", "white")
		.attr("stroke", "none");

	    transitions.maybeTransition(
		junctionMasks.select(".background-mask"))
		.attr("cx", function(d, i) {
		    return d.edgeJunction[0];
		})
		.attr("cy", function(d, i) {
		    return d.edgeJunction[1];
		});
	    
	    newMasks
		.append("circle")
		.classed("hidden-mask", true)
		.attr("r", function(d, i) {
		    return d.type === "process" ? 7 : 5;
		})
		.attr("fill", "black")
		.attr("stroke", "none");

	    transitions.maybeTransition(
		junctionMasks.select(".hidden-mask"))
		.attr("cx", function(d, i) {
		    return d.edgeJunction[0];
		})
		.attr("cy", function(d, i) {
		    return d.edgeJunction[1];
		});
	},

	/*
	 When we move or resize a node, we redraw it individually to prevent slowdown.

	 This function lets us also redraw its incoming and outgoing edges at the some time.
	 */
	redrawEdgesToNode = function(edgesInCoords, edgesOutCoords, nodeId) {
	    var direction = getLayout().getOrientationCoords(),
		nodeCollection = getNodeCollection(),
		node = nodeCollection.get(nodeId),
		edgesSelection = d3.select("#non-existant-element"),
		
		outgoing = node.edges().forEach(function(e) {
		    var element = d3.select("#edge-" + e.parent().id + "-to-" + e.node().id),
			d = element.datum();

		    d.path = edgePath(
			edgesOutCoords,
			/* Find the existing edge and use the last coordinate of its path as the start point. */			    
			d.path.pop(),
			direction
		    );

		    edgesSelection[0].push(element.node());
		}),
		
		incoming = nodeCollection.edgesToNode(node)
		    .forEach(function(e) {
			var element = d3.select("#edge-" + e.parent().id + "-to-" + e.node().id),
			    d = element.datum();

			d.path = edgePath(
			    /* Find the existing edge and use the first coordinate of its path as the start point. */
			    d.path[0],
			    edgesInCoords,
			    direction
			);

			edgesSelection[0].push(element.node());
		    });

	    drawEdges(
		edgesSelection,
	    	empty
	    );
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
		    .on("drag", function(d) {
			tryDrag(
			    d3.select(this),
			    function(g) {
				var x = d3.event.x,
				    y = d3.event.y,
				    layout = getLayout();

				layout.setPosition(d.id, [x, y]);
				d.x = x;
				d.y = y;

				/*
				 Update some properties on the view model which depend on its size and position.
				 */
				d.resize(d.size);
				
				drawNodes(g, empty);
				drawJunctionMasks([d], true);
				redrawEdgesToNode(d.edgeEnd, d.edgeJunction, d.id);
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

		var l = getLayout();
		l.setSize(d.id, null);
		l.setPosition(d.id, null);
		
		update();
	    });
	},

	dragResize = d3.behavior.drag()
    	    .origin(function(d){
		return {
		    x: d.size[0],
		    y: d.size[1]
		};
	    })
	    .on("dragstart", function(d){
		d3.event.sourceEvent.stopPropagation();
		transitions.enabled(false);
	    })
	    .on("drag", function(d){
		var x = d3.event.x,
		    y = d3.event.y,
		    layout = getLayout();

		layout.setSize(d.id, [x, y]);
		d.resize(layout.getSize(d.id));
		
		drawNodes(
		    d3.select(this.parentElement),
		    empty
		);

		drawJunctionMasks([d], true);
		redrawEdgesToNode(d.edgeEnd, d.edgeJunction, d.id);
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

			/*
			 Resize my node to fit the description box.
			 */
			getLayout().setSize(
			    d.id,
			    [
				d.size[0],
				d3.select(this.parentNode)
				    .select(".node-description")
				    .node()
				    .scrollHeight + 45				
			    ]
			);

			update();
		    }
		})
		.call(dragResize)
		.append("text")
		.text("⇘")
		.classed("no-select", true);

	    nodes.select("g.resize-handle")
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size[0] - 8) + "," + (d.size[1] - 0.5) + ")";
		});

	},

	drawNodeName = function(nodes, newNodes) {
	    var newNameGroups = newNodes.append("g")
		    .classed("name", true)
		    .attr("transform", "translate(20, 5)");

	    var nameGroups = nodes.select("g.name");

	    svgEditableText(
		nameGroups,
		newNameGroups,
		0,
		0, 
		function(d, i) {
		    return (d.size[0] - 35);
		},
		21,
		"node-name",
		function content(d, i) {
		    return d.name;
		},
		function onChange(d, i, val) {
		    getNodeCollection()
			.get(d.id)
			.name(val);
		},
		toolbar,
		true
	    );
	};

    var drawNodeDescription = function(nodes, newNodes) {
	var newDescriptionGroups = newNodes.append("g")
		.classed("description", true)
		.attr("transform", "translate(20, 26)");

	var descriptionGroups = nodes.select("g.description");

	svgEditableText(
	    descriptionGroups,
	    newDescriptionGroups,
	    0,
	    0, 
	    function(d, i) {
		return (d.size[0] - 35);
	    },
	    function(d, i) {
		return (d.size[1] - 40);
	    },
	    "node-description",
	    function content(d, i) {
		return d.description;
	    },
	    function onChange(d, i, val) {
		getNodeCollection()
		    .get(d.id)
		    .description(val);
	    },
	    toolbar,
	    false
	);
    },

	drawExpandContract = function(nodes, newNodes) {
	    var newExpanders = newNodes.append("g")
		    .classed("expander", true)
		    .attr("transform", function(d, i) {
			return "translate(0, 15)";
		    })
		    .on("mousedown", function(d, i) {
			/*
			 The click from this button won't become part of a drag event.
			 */
			d3.event.stopPropagation();
		    })	    
    		    .on("click", function(d, i) {
			getLayout().setCollapsed(d.id, !d.collapsed);
			
			update();
		    });

	    newExpanders
	    	.append("rect")
		.attr("width", 15)
		.attr("height", 15);

	    newExpanders
		.append("text")
		.classed("no-select", true)
		.attr("x", 7.5)
		.attr("y", 13)
		.attr("width", 15)
		.attr("height", 15)
		.attr("text-anchor", "middle");
	    
	    nodes.select("g.expander")
		.style("visibility", function(d, i) {
		    return (!d.collapsed && d.isLeaf) ? "hidden" : "visible";
		})
		.select("text")
		.text(function(d, i) {
		    return d.collapsed ? "+" : String.fromCharCode("8259");
		});
	},

	drawDeleteButton = function(nodes, newNodes) {
	    var newDelete = newNodes.append("g")
		    .classed("delete-button", true);

	    newDelete.append("rect")
		.attr("width", 15)
		.attr("height", 15);

	    newDelete.append("text")
		.text("X")
		.classed("no-select", true)
		.attr("x", 3)
		.attr("y", 12)
		.on("mousedown", function(d, i) {
		    /*
		    The click from this button won't become part of a drag event.
		    */
		    d3.event.stopPropagation();
		})	    
		.on("click", function(d, i) {
		    getNodeCollection().deleteNode(d.id);
		    update();
		});

	    nodes.select("g.delete-button")
		.select("text");
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
		.classed("no-select", true)
		.text(function(d, i){
		    return d.type[0].toUpperCase();
		});

	    displayNodes.select("g.node-type")
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size[0] - d.sidePadding - 2) + "," + 13 + ")";
		});
	},

	drawNodes = function(nodes, newNodes) {
	    newNodes
		.append("rect")
		.classed("node-box", true)
		.each(function(d, i) {
		    d3.select(this).classed("node-box-" + d.type, true);
		});

	    nodes
		.classed("selected", function(d, i) {
		    return d.selected;
		})
		.select("rect.node-box")
		.attr("width", function(d, i) {
		    return d.size[0] + "px";
		})
		.attr("height", function(d, i) {
		    return d.size[1] + "px";
		});

	    drawNodeName(nodes, newNodes);
	    drawNodeDescription(nodes, newNodes);

	    transitions.maybeTransition(nodes).attr("transform", function(d, i){
		return "translate(" + (d.x) + "," + d.y + ")";
	    });
	    
	    drawExpandContract(nodes, newNodes);
	    drawDeleteButton(nodes, newNodes);
	    
	    drawMoveHandle(nodes, newNodes);
	    drawResizeHandle(nodes, newNodes);

	    drawNodeType(nodes, newNodes);

	    types.entries().forEach(function(e) {
		e.value(
		    filterByType(nodes, e.key),
		    filterByType(newNodes, e.key)		    
		);
	    });

	    drawNodesHook(nodes, newNodes);
	};

    return {
	registerType: function(key, value) {
	    types.set(key, value);
	},

	redrawNode: function(nodeSelection) {
	    drawNodes(nodeSelection, empty);
	},

	selectNodes: function(ids) {
	    return container.selectAll("g." + nodeClass);
	},

	drawNodesHook: drawNodesHook.add,
	
	draw: function(nodeData) {
	    var nodes = container.selectAll("g." + nodeClass)
		    .data(
			nodeData,
			function(d, i) {
			    return d.id;
			}
		    );

	    var newNodes = nodes.enter()
		    .append("g")
		    .classed("process-node", true);

	    transitions.fadeOut(nodes);	    

	    drawNodes(nodes, newNodes);
	    drawJunctionMasks(nodeData);
	}
    };
    
};
