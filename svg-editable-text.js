"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.svgEditableText = function(selection, x, y, width, height, name, inputFunction) {
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
	    .classed(name, "true")
	    .on("input", inputFunction)
	    .call(preventDrag);
};
