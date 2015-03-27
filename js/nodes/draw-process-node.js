"use strict";

/*global module, require*/

var d3 = require("d3"),
    onScroll = require("../helpers.js").onScroll,
    allowedTypes = require("./allowed-types.js"),
    circleFraction = require("../circle-fraction.js"),
    junctionRadius = 5,
    dependencyArcRadius = 7;

module.exports = function(drawNodes, getNodeCollection, transitions, update) {
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

    var modifyIndex,
	dragEvidence = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d, i) {
		var evidence = d.node.evidence.slice(0),
		    scale = d.node.innerWidth,
		    newWidth = d3.event.x;

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
			    modifyIndex = 1;
			} else {
			    modifyIndex = 0;
			}
			
			break;
		    default:
			throw new Error("Unsupported evidence part: " + d.type);
		    }
		}

		evidence[modifyIndex] = newWidth / scale;

		var node = getNodeCollection().get(d.node.id);

		node.localEvidence(evidence);

		d.node.evidence = node.p();

		drawNodes.redrawNode(d3.select(this.parentNode.parentNode));
	    })
	    .on("dragend", function(d, i) {
		modifyIndex = undefined;
		update();
	    });

    var dragDependency = d3.behavior.drag()
	    .on("dragstart", function(d, i) {
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d, i) {
		var toChange = getNodeCollection()
			.get(d.data.node.id),
		    
		    fraction = circleFraction(this.parentNode, d3.event);

		toChange.dependence(1 - fraction);
		d.data.node.dependence = toChange.dependence();
		
		drawNodes.redrawNode(d3.select(this.parentNode.parentNode));
	    })
	    .on("dragend", function(d, i) {
		update();
	    });

    var dragNode = d3.behavior.drag()
	    .on("dragstart", function(d) {
		/* Nothing else should get this click now. */
		d3.event.sourceEvent.stopPropagation();
	    })
	    .on("drag", function(d) {
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
	    .on("dragend", function(d, i) {
		/* See if we're over an existing different node. 
		 If so, make an edge to it.
		 Otherwise, we'll make an edge to a new node. */
		var nodes = getNodeCollection(),
		    oldNode = nodes.get(d.id),
		    target = findDragTarget(),
		    newNode;

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

		try {
		    oldNode.edgeTo(newNode); 
		    update();
		} finally {
		    if (d.previousDragTarget) {
			d.previousDragTarget.classed("drag-target", false);
		    }
		}
	    });

    var drawEdgeJunctionGroup = function(nodes, newNodes, callback) {
	var newJunctions = newNodes
		.append("g")
		.classed("handle", true)
		.attr("draggable", true)
		.call(dragNode);

	var junctions = nodes.select("g.handle");

	transitions.maybeTransition(junctions)
		.style("visibility", function(d, i) {
		    return d.collapsed ? "hidden" : "visible";
		})
		.attr("transform", function(d, i) {
		    return "translate(" + d.junctionOffset[0] + "," + d.junctionOffset[1] + ")";
		});

	callback(junctions, newJunctions);
    };

    var drawSimpleJunction = function(junctions, newJunctions) {
	newJunctions.append("circle")
	    .attr("r", junctionRadius)
	    .style("fill", "white")
	    .call(dragNode);
    };

    var drawDependencyArc = function(junctions, newJunctions) {
	var arc = d3.svg.arc()
		.innerRadius(junctionRadius)
		.outerRadius(dependencyArcRadius),
	    pie = d3.layout.pie()
		.sort(null)
		.value(function(d, i) {
		    return d.value;
		});

	var dependenceArc = junctions.selectAll("path")
		.data(
		    function(d, i) {
			var dependence = d.collapsed ? 0 : d.dependence,
			    independence = 1 - dependence;

			return pie([
			    {type: "dependence", color: "black", node: d, value: dependence},
			    {type: "independence", color: "white", node: d, value: independence}
			]);
		    },
		    function(d, i) {
			return d.data.type;
		    }
		);
	
	dependenceArc.exit().remove();
	dependenceArc.enter()
	    .append("path")
	    .attr("fill", function(d, i){
		return d.data.color;
	    })
	    .attr("stroke-width", 0.4)
	    .call(dragDependency);

	dependenceArc
	    .attr("d", arc);

	junctions.call(onScroll, function(d, i, change) {
	    var node = getNodeCollection()
		    .get(d.id);

	    node.dependence(d.dependence + change);

	    update();
	});
    };

    var toggleableText = function(nodes, newNodes, clazz, text, colouring, toggle) {
	newNodes.append("g")
	    .classed(clazz, true)
	    .classed("toggleable-text", true)
	    .append("text")
	    .style("text-anchor", "middle")
	    .on("click", function(d, i) {
		d3.event.preventDefault();
		d3.event.stopPropagation();

		toggle(
		    getNodeCollection().get(d.id)
		);
		
		update();
	    });
	
	nodes.select("g." + clazz)
	    .select("text")
	    .attr("x", function(d, i) {
		return d.size[0] / 2;
	    })
	    .attr("y", function(d, i) {
		return d.size[1] - 10;
	    })
	    .attr("width", function(d, i) {
		return d.innerWidth;
	    })
	    .text(function(d, i) {
		return text(d);
	    })
	    .attr("fill", function(d, i) {
		return colouring(d);
	    });
    };

    drawNodes.registerType("undecided", function(nodes, newNodes) {
	var typeOptions = nodes.selectAll("g.node-choice")
		.data(
		    function(d, i) {
			return allowedTypes(d, getNodeCollection())
			    .values()
			    .map(function(option) {
				return {nodeId: d.id, nodeSize: d.size, option: option};
			    });
		    },
		    function (d, i) {
			return d.nodeId + "-" + d.option;
		    }
		);

	typeOptions.exit().remove();

	var newOptions = typeOptions.enter().append("g")
		.classed("node-choice", true)
		.each(function(d, i) {
		    d3.select(this).classed("node-choice-" + d.option, true);
		})
		.on("click", function(d, i) {
		    var nodeCollection = getNodeCollection();
		    nodeCollection.chooseNodeType(
			nodeCollection.get(d.nodeId),
			d.option
		    );

		    update();
		});

	newOptions.append("rect")
	    .attr("width", 20)
	    .attr("height", 20);


	newOptions.append("text")
	    .attr("y", 15)
	    .attr("x", 6)
	    .text(function(d, i) {
		return d.option[0].toUpperCase();
	    });

	transitions.maybeTransition(typeOptions)
	    .attr("transform", function(d, i) {
		return "translate(" + (5 + (i * 25)) + "," + (d.nodeSize[1]- 24) + ")";
	    });
    });

    drawNodes.registerType("process", function(nodes, newNodes) {
	var drawIntervalParts = function(g) {
	    g.attr("transform", function(d, i) {
		return "rotate(180," +  (d.size[0] / 2) + ", 0)translate(" + 0 + "," + (4 - d.size[1])  + ")";
	    });


	    /* Given an SVG group which has a node as its datum, and a function which returns its interval probabilities, fill it with some interval parts. */
	    var parts = g.selectAll("rect")
    		    .data(
			function(viewNode, i) {
			    var p = viewNode.evidence,
				lower = Math.min(p[0], p[1]),
				upper = Math.max(p[0], p[1]),
				conflict = p[0] > p[1],
				gap = upper - lower;


			    var intervalData = [
				{node: viewNode, type: "failure", width: lower, x: 0},
				{node: viewNode, type: "conflict", width: conflict ? gap : 0, x: lower},
				{node: viewNode, type: "uncertainty", width: conflict ? 0 : gap, x: lower},
				{node: viewNode, type: "success", width: 1 - upper, x: upper}
			    ];

			    intervalData.forEach(function(d) {
				d.nodeInnerWidth = viewNode.innerWidth;
				d.nodeSidePadding = viewNode.sidePadding;
			    });

			    return intervalData;
			},
			function(d, i) {
			    return d.node.id + "/" + d.type;
			}
		    );

	    parts.enter()
		.append("rect")
		.attr("height", "15px")
		.call(dragEvidence)
	    	.attr("class", function(d, i) {
		    return d.type;
		})
		.call(onScroll, function(d, i, change){
		    if (!d.node.isLeaf || d.node.collapsed) {
			return;
		    }

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

	    parts
		.attr("x", function(d, i) {
		    return (d.nodeSidePadding + (d.nodeInnerWidth * d.x)) + "px";
		})
		.attr("width", function(d, i) {
		    return (d.nodeInnerWidth * d.width) + "px";
		});
	};

	newNodes.append("g")
	    .classed("interval", "true");

	drawIntervalParts(nodes.select("g.interval"));

	drawEdgeJunctionGroup(
	    nodes,
	    newNodes,
            function(junctions, newJunctions) {
		drawSimpleJunction(junctions, newJunctions);
		drawDependencyArc(junctions, newJunctions);
            });

    });

    drawNodes.registerType("issue", function(nodes, newNodes) {
	drawEdgeJunctionGroup(
	    nodes,
	    newNodes,	    
	    drawSimpleJunction
	);

	toggleableText(
	    nodes,
	    newNodes,
	    "issue-settled-display", 
	    function text(d) {
		return d.settled ? "Settled" : "Open";
	    }, 
	    function colouring(d) {
		return d.settled ? "green" : "red";
	    },
	    function toggle(node) {
		node.settled(!node.settled());
	    }
	);
    });

    drawNodes.registerType("option", function(nodes, newNodes) {
	drawEdgeJunctionGroup(
	    nodes,
	    newNodes,	    
	    drawSimpleJunction
	);
    });

    drawNodes.registerType("argument", function(nodes, newNodes) {
	toggleableText(
	    nodes,
	    newNodes,
	    "issue-settled-display", 
	    function text(d) {
		return d.support ? "Supports" : "Refutes";
	    }, 
	    function colouring(d) {
		return d.support ? "yellow" : "cyan";
	    },
	    function toggle(node) {
		node.support(!node.support());
	    }
	);
    });
};
