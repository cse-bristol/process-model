"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler,

    constants = require("./drawing-constants.js"),
    buttonSize = constants.buttonSize,
    textXOffset = constants.textXOffset,
    textYOffset = constants.textYOffset;


module.exports = function(getNodeCollection, getLayoutState, viewport, update) {
    var onBottomMarginDraw = callbacks(),

	marginVisibility = function(selection) {
	    selection.style("visibility", function(d, i) {
		return d.margin.vertical ? "visible" : "hidden";
	    });
	},

	drawType = function(margins, newMargins) {
	    newMargins
		.append("g")
		.classed("node-type", true)
		.append("text")
		.classed("no-select", true)
		.text(function(d, i){
		    return d.type[0].toUpperCase();
		});

	    margins.select("g.node-type")
		.attr("transform", function(d, i) {
		    return "translate(" + (d.size[0] - 12) + "," + 12 + ")";
		});
	},

	drawButton = function(buttonText, onClick, cssClass, position) {
	    var translate = "translate(" + (position * buttonSize) + ",0)";
	    
	    return function(margins, newMargins) {
		var newButtons = newMargins.append("g")
			.classed("margin-button", true)
			.classed(cssClass, true)
		/*
		 Prevent highlighting the text inside this button.
		 */
			.classed("no-select", true)
			.attr("transform", translate)
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
		    .attr("x", textXOffset)
		    .attr("y", textYOffset);

		var buttons = margins.select("g." + cssClass);

		buttons.select("rect")
		    .attr("height", function(d, i) {
			return d.margin.vertical;
		    });

		return buttons;
	    };
	},

	drawDelete = drawButton(
	    "X",
	    function(d, i) {
		getNodeCollection().deleteNode(d.id);
	    },
	    "delete-button",
	    0
	),

	drawFocus = drawButton(
	    "F",
	    function(d, i) {
		viewport.focusSubTree(d.id);
	    },
	    "focus-subtree-tool",
	    1
	),

	drawExpand = drawButton(
	    "+",
	    function(d, i) {
		getLayoutState().setCollapsed(d.id, false);
	    },
	    "expand-button",
	    2
	),

	drawContract = drawButton(
	    String.fromCharCode("8259"),
	    function(d, i) {
		getLayoutState().setCollapsed(d.id, true);		
	    },
	    "contract-button",
	    2
	),

	drawExpandContract = function(margins, newMargins) {
	    drawExpand(margins, newMargins)
		.style("visibility", function(d, i) {
		    return d.collapsed ? null : "hidden";
		});

	    drawContract(margins, newMargins)
		.style("visibility", function(d, i) {
		    return d.canCollapse ? null : "hidden";
		});
	};

    return function(nodes, newNodes) {
	var newTopMargins = newNodes.append("g")
		.classed("node-top-margin", true);

	var topMargins = nodes.select("g.node-top-margin")
		.call(marginVisibility);


	drawDelete(topMargins, newTopMargins);
	drawFocus(topMargins, newTopMargins);
	drawExpandContract(topMargins, newTopMargins);
	drawType(topMargins, newTopMargins);
	
	var newBottomMargins = newNodes.append("g")
		.classed("node-bottom-margin", true);

	var bottomMargins = nodes.select("g.node-bottom-margin")
	    	.call(marginVisibility)
	    	.attr("transform", function(d, i) {
		    return "translate(0," + (d.size[1] - d.margin.vertical)  + ")";
		});

	return {
	    topMargins: topMargins,
	    newTopMargins: newTopMargins,
	    bottomMargins: bottomMargins,
	    newBottomMargins: newBottomMargins
	};
    };
};
