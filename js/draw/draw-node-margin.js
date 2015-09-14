"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,

    svgTextWrapping = require("./svg-text-wrapping"),

    constants = require("./drawing-constants.js"),
    buttonSize = constants.buttonSize,
    paddingBetweenButtons = constants.paddingBetweenButtons,
    buttonCornerRadius = constants.buttonCornerRadius,

    /*
     The value of SVG text scale at which Chrome stops having bugs.
     */
    epsilon = 0.001;

module.exports = function(getNodeCollection, getLayoutState, viewpoint, transitions, update) {
    var onBottomMarginDraw = callbacks(),

	centreNode = function(d, i) {
	    if (!d3.event.defaultPrevented) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
		
		viewpoint.centreNode(d.id);
	    }
	},

	drawType = function(margins, newMargins) {
	    var newMarginGroups = newMargins
		.append("g")
		    .classed("node-type", true)
		    .attr("transform", function(d, i) {
			return "translate(" + d.margin.horizontal + ",0)";
		    });

	    newMarginGroups
		.append("rect")
		.classed("node-type-background", true)
		.attr("width", buttonSize)
		.attr("height", buttonSize)
		.attr("rx", buttonCornerRadius)
		.attr("ry", buttonCornerRadius);
	    
	    newMarginGroups
		.append("text")
		.classed("no-select", true)
		.attr("text-anchor", "middle")
		.text(function(d, i){
		    return d.type[0].toUpperCase();
		})
		.attr("x", buttonSize / 2)
		.attr("dominant-baseline", "central")
		.attr("y", buttonSize / 2);
	},

	drawNodeName = function(topMargins, newTopMargins) {
	    newTopMargins.append("g")
		.classed("name", true)
		.on("click", centreNode)
		.append("text");

	    var names = topMargins.select("g.name")
		    .style("visibility", function(d, i) {
			/*
			 If the node is centred, we'll provide a text box for the user to edit it instead of display SVG text.
			 */
			return d.centred ? "hidden" : "visible";
		    });

	    transitions.maybeTransition(names)
	    	.attr("transform", function(d, i) {
		    return "translate(" + d.margin.horizontal + "," + d.margin.top + ")";
		});

	    names
		.select("text")
		.call(
		    svgTextWrapping,
		    function(d, i) {
			return d.name;
		    },
		    function(d) {
			return d.innerWidth;
		    },
		    function(d) {
			return d.innerHeight;
		    }
		);
	},

	drawButton = function(buttonText, onClick, cssClass, position) {
	    return function(margins, newMargins) {
		var newButtons = newMargins.append("g")
			.classed("margin-button", true)
			.classed(cssClass, true)
		/*
		 Prevent highlighting the text inside this button.
		 */
			.classed("no-select", true)
			.on("mousedown", function(d, i) {
			    /*
			     The click from this button won't become part of a drag event.
			     */
			    d3.event.stopPropagation();
			})	    
			.on("click", function(d, i) {
			    onClick(d, i);
			    update();
			});

		newButtons.append("rect")
		    .attr("width", buttonSize);

		newButtons.append("text")
		    .text(buttonText)
		    .attr("text-anchor", "middle")
		    .attr("x", buttonSize / 2)
		    .attr("dominant-baseline", "central")
		    .attr("y", buttonSize / 2);

		var buttons = margins.select("g." + cssClass);

		transitions.maybeTransition(buttons)
		    .attr("transform", function(d, i) {
			var horizontal = d.size[0] - d.margin.horizontal - buttonSize,
			    vertical = d.margin.top + (position * (buttonSize + paddingBetweenButtons));
			
			return "translate(" + horizontal + "," + vertical + ")";
		    });

		buttons.select("rect")
		    .attr("height", buttonSize);

		return buttons;
	    };
	},

	drawDelete = drawButton(
	    "P",
	    function(d, i) {
		getNodeCollection().deleteNode(d.id);
	    },
	    "delete-button",
	    0
	),

	drawFocus = drawButton(
	    "y",
	    function(d, i) {
		viewpoint.focusSubTree(d.id);
	    },
	    "focus-subtree-tool",
	    1
	);

    return function(nodes, newNodes) {
	var newTopMargins = newNodes.append("g")
		.classed("node-top-margin", true);

	var topMargins = nodes.select("g.node-top-margin");

	drawNodeName(topMargins, newTopMargins);

	drawDelete(topMargins, newTopMargins);
	drawFocus(topMargins, newTopMargins);
	
	var newBottomMargins = newNodes.append("g")
		.classed("node-bottom-margin", true);

	var bottomMargins = nodes.select("g.node-bottom-margin");

	var maybeScaleBottomMargins = transitions.maybeTransition(bottomMargins);

	if (maybeScaleBottomMargins.attrTween) {
	    /*
	     This custom tween overrides the normal animation for the scale part of this transform.

	     It proceeds smoothly between scale 0.2 and scale 1, but below scale 0.2 it will snap straight to scale 0.

	     This is to avoid a problem in Chrome where SVG text does not scale correctly for very small scale values.
	     */
	    maybeScaleBottomMargins
		.attrTween("transform", function(d, i, a) {
		    var parts = a ? a.split("scale(1,") : null,
			translatePart = parts ? parts[0] : null,
			scaleNumber = parts ? parseFloat(parts[1]) : null,
			
			interpolateTranslate = d3.interpolate(
			    translatePart,
			    "translate(0," + (d.size[1] - d.margin.bottom)  + ")"
			),
			interpolateScale = d3.interpolate(
			    scaleNumber,
			    d.margin.bottom ? 1 : 0
			);

		    return function(t) {
			var scale = interpolateScale(t);

			if (scale < 0.001) {
			    scale = 0;
			}

			return interpolateTranslate(t) + "scale(1," + scale + ")";
		    };
		})
		.attrTween("visibility", function(d, i, startVal) {
		    var endVal = d.margin.bottom ? "visible" : "hidden";
		    
		    return function(t) {
			if (t < epsilon) {
			    return startVal;
			} else if (1 - t < epsilon) {
			    return endVal;
			} else if (startVal === "visible" || endVal === "visible") {
			    return "visible";
			} else {
			    return "hidden";
			}
		    };
		});
	    
	} else {
	    maybeScaleBottomMargins
		.attr("transform", function(d, i) {
		    return "translate(0," + (d.size[1] - d.margin.bottom) + ")"
			+ "scale(1," + (d.margin.bottom ? 1 : 0) + ")";
		})
		.attr("visibility", function(d, i) {
		    return d.margin.bottom ? "visible" : "hidden";
		});
	}
	
	drawType(bottomMargins, newBottomMargins);

	return {
	    topMargins: topMargins,
	    newTopMargins: newTopMargins,
	    bottomMargins: bottomMargins,
	    newBottomMargins: newBottomMargins
	};
    };
};
