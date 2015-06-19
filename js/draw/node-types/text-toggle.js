"use strict";

/*global module, require*/

var d3 = require("d3"),

    constants = require("../drawing-constants.js"),
    textYOffset = constants.textYOffset;

/*
 Draws some read-only text. Clicking on it will toggle it between states and colours.
 */
module.exports = function(getNodeCollection, transitions, update, clazz, text, colouring, toggle) {
    return function(margins, newMargins) {
	newMargins.append("g")
	    .classed(clazz, true)
	    .classed("toggleable-text", true)
	    .classed("no-select", true)
	    .append("text")
	    .attr("y", textYOffset)
	    .on("mousedown", function(d, i) {
		/*
		 The click from this button won't become part of a drag event.
		 */
		d3.event.stopPropagation();
	    })	
	    .on("click", function(d, i) {
		d3.event.preventDefault();
		d3.event.stopPropagation();

		toggle(
		    getNodeCollection().get(d.id)
		);
		
		update();
	    });

	transitions.maybeTransition(
	    margins.select("g." + clazz)
		.select("text")
	)
	    .attr("x", function(d, i) {
		return d.centre[0];
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
};
