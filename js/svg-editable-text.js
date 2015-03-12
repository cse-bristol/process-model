"use strict";

/*global require, module, zeditor */

var d3 = require("d3");

module.exports = function(selection, newSelection, x, y, width, height, name, contentFunction, onChange, toolbar, plaintext) {
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
	    .attr("tabindex", 0)
	    .classed(name, "true");

    if (plaintext) {
	newInput
	    .classed("plaintext", true)
	    .on("mousedown", function(d, i) {
		d3.event.stopPropagation();
		toolbar.hide();
	    })
	    .on("input", function(d, i) {
		onChange(
		    d3.select(this).text()
		);
	    });
	
    } else {
	toolbar(
	    newInput,
	    onChange
	);
    }

    var input = foreign.selectAll("." + name)
	.attr("name", name)
	.style("width", function(d, i) {
	    var w = width instanceof Function ? width(d, i) : width;
	    return (w - 5) + "px";
	})
	.html(contentFunction);
};
