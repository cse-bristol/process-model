"use strict";

/*global require, module */

var d3 = require("d3");

module.exports = function(selection, x, y, width, height, name, inputFunction) {
    var preventDrag = d3.behavior.drag()
	    .on("dragstart", function(d){
		d3.event.sourceEvent.stopPropagation();
	    });

    var foreign = selection
	    .append("foreignObject")
	    .attr("x", x)
	    .attr("y", y)
	    .attr("width", width)
	    .attr("height", height)
	    .append("xhtml:input")
	    .attr("type", "text")
	    .attr("name", name)
	    .style("width", width + "px")
	    .classed(name, "true")
	    .on("input", inputFunction)
	    .call(preventDrag);
};
