"use strict";

/*global require, module */

var d3 = require("d3");

module.exports = function(selection, newSelection, x, y, width, height, name, contentFunction, onChange, onLoseFocus, plaintext) {
    var newForeign = newSelection
	    .append("foreignObject")
	    .classed("svg-editable-text", true)
	    .attr("x", x)
	    .attr("y", y);

    var foreign = selection.selectAll(".svg-editable-text")
	    .attr("width", width)
	    .attr("height", height);

    var newInput = newForeign
	    .append("xhtml:div")
	    .attr("contenteditable", "true")
	    .classed(name, "true")
	    .on("input", function(d, i) {
		onChange(d, i, d3.select(this).html());
	    })
	    .on("mousedown", function(d, i) {
		// If this event bubbles up, the d3 drag behaviours will get hold of it and make trouble.
		d3.event.stopPropagation();
	    })
	    .on("blur", onLoseFocus);

    foreign.selectAll("." + name)
	.attr("name", name)
	.style("width", function(d, i) {
	    var w = width instanceof Function ? width(d, i) : width;
	    return (w - 5) + "px";
	})
	.html(contentFunction);

    if (plaintext) {
	newInput
	    .classed("plaintext", true);
    }
};
