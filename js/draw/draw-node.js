"use strict";

/*global module, require*/

var d3 = require("d3"),
  
    svgTextWrapping = require("./svg-text-wrapping.js"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,
    edgePath = require("../layout/edge-path.js"),

    empty = d3.select();

/*
 Draws parts which are common to all types of node.
 */
module.exports = function(container, defs, getNodeCollection, getLayout, viewport, transitions, drawEdges, redrawNode, selectNodes, update) {
    /*
     Used to tidy up the beginnings of edges.
     */
    var drawJunctionMasks = function(nodeData, keepMissing) {
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
	    .attr("fill", "black")
	    .attr("stroke", "none");

	transitions.maybeTransition(
	    junctionMasks.select(".hidden-mask"))
	    .attr("r", function(d, i) {
		if (d.collapsed) {
		    return 0;
		} else if (d.type === "process" && d.detail) {
		    return 7;
		} else {
		    return 5;
		}
	    })	
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

		    d.setEdgePath(
			edgePath(
			    edgesOutCoords,
			    /* Find the existing edge and use the last coordinate of its path as the start point. */			    
			    d.path.pop(),
			    direction
			)
		    );

		    edgesSelection[0].push(element.node());
		}),
		
		incoming = nodeCollection.edgesToNode(node)
		    .forEach(function(e) {
			var element = d3.select("#edge-" + e.parent().id + "-to-" + e.node().id),
			    d = element.datum();

			d.setEdgePath(
			    edgePath(
				/* Find the existing edge and use the first coordinate of its path as the start point. */
				d.path[0],
				edgesInCoords,
				direction
			    )
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
				transitions.disable();
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
				
				redrawNode(g);
				drawJunctionMasks([d], true);
				redrawEdgesToNode(d.edgeEnd, d.edgeJunction, d.id);
			    }
			);
		    })
		    .on("dragend", function(d) {
			update();			
			transitions.enable();
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
	    .on("dragstart", function(d) {
		d3.event.sourceEvent.stopPropagation();
		transitions.disable();
	    })
	    .on("drag", function(d){
		var x = d3.event.x,
		    y = d3.event.y,
		    layout = getLayout();

		layout.setSize(d.id, [x, y]);
		d.resize(layout.getSize(d.id));
		
		redrawNode(
		    d3.select(this.parentElement)
		);

		drawJunctionMasks([d], true);
		redrawEdgesToNode(d.edgeEnd, d.edgeJunction, d.id);
	    })
	    .on("dragend", function(d) {
		transitions.enable();
		update();		
	    }),

	drawResizeHandle = function(nodes, newNodes) {
	    newNodes.append("path")
		.classed("resize-handle", true)
		.call(dragResize);

	    transitions.maybeTransition(
		nodes.select("path.resize-handle"))
		.style("visibility", function(d, i) {
		    return d.centred ? "hidden" : "visible";
		})
		.attr("d", function(d, i) {
		    return [
			// Top-right
			"M", d.size[0], 0,
			// Bottom-right
			"L", d.size[0], d.size[1],
			// Bottom-left
			"L", 0, d.size[1]
		    ].join(" ");
		});
	},

	closeEnough = function(bbox, x, y) {
	    return (bbox.x >= x || (bbox.x + bbox.width) <= x) &&
		(bbox.y >= y || (bbox.y + bbox.height) <= y);
	},
	
	centreNode = function(d, i) {
	    if (!d3.event.defaultPrevented) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
		
		viewport.centreNode(d.id);
	    }
	},

	drawNodes = function(nodes, newNodes) {
	    newNodes
		.append("rect")
		.classed("node-box", true)
		.on("click", centreNode)	    
		.each(function(d, i) {
		    d3.select(this).classed("node-box-" + d.type, true);
		});

	    var rects = nodes
		.classed("selected", function(d, i) {
		    return d.selected;
		})
		    .select("rect.node-box");

	    transitions.maybeTransition(rects)
		.attr("width", function(d, i) {
		    return d.size[0] + "px";
		})
		.attr("height", function(d, i) {
		    return d.size[1] + "px";
		});

	    transitions.maybeTransition(nodes)
		.attr("transform", function(d, i){
		    return "translate(" + (d.x) + "," + d.y + ")";
		});
	    
	    drawMoveHandle(nodes, newNodes);
	    drawResizeHandle(nodes, newNodes);
	};

    return {
	redrawNode: function(nodes, newNodes) {
	    drawNodes(nodes, newNodes);
	},

	draw: function(nodeData) {
	    var nodes = selectNodes()
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

	    return {
		nodes: nodes,
		newNodes: newNodes
	    };
	}
    };
};
