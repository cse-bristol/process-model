"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.svgEditableText = function(selection, x, y, width, height, name) {
    var foreign = selection.append("foreignObject")
	    .attr("x", x)
	    .attr("y", y)
	    .attr("width", width)
	    .attr("height", height);

    foreign.append("xhtml:input")
	.attr("type", "text")
	.attr("name", name)
	.classed(name, "true")
	.on("input", function(d, i){
	    try {
		d.name(this.value);
		d3.select(this).classed("name-error", false);
	    } catch (err) {
		d3.select(this).classed("name-error", true);
	    }
	});
};
