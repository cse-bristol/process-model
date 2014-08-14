"use strict";

/*global require, module */

var d3 = require("d3");

module.exports = function(selection, newSelection, x, y, width, height, name, inputFunction) {
    var preventDrag = d3.behavior.drag()
	    .on("dragstart", function(d){
		d3.event.sourceEvent.stopPropagation();
	    });

    var newForeign = newSelection
	    .append("foreignObject")
	    .classed("svg-editable-text", true)
	    .attr("x", x)
	    .attr("y", y);

    var foreign = selection.selectAll(".svg-editable-text")
	    .attr("width", width)
	    .attr("height", height);

    var newInput = newForeign
	    .append("xhtml:input")
	    .attr("type", "text")
	    .classed(name, "true")
	    .on("input", inputFunction)
	    .call(preventDrag);

    foreign.selectAll("." + name)
	    .attr("name", name)
	    .style("width", function(d, i) {
		var w = width instanceof Function ? width(d, i) : width;
		return (w - 5) + "px";
	    });
};
