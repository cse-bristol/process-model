"use strict";

/*global module, require*/

var deEmphasizeId = "desaturate-blur",
    // Desaturated greyscale
    g = 1/3,
    desaturatedMatrix = [
	g, g, g, 0, 0,
	g, g, g, 0, 0,
	g, g, g, 0, 0,
	0, 0, 0, 1, 0
    ],

    emphasizeId = "focus-drop-shadow",
    emphasizeThickness = 2,
    emphasizeOpacity = 0.5,
    
    normalId = "standard-drop-shadow",
    normalThickness = 2,
    normalOpacity = 0.3;

module.exports = function(defs) {
    var asCSS = function(elementId) {
	return "url(#" + elementId + ")";
    },

	makeDropShadow = function(filter, thickness, opacity) {
	    // Make a blurred version of the node.
	    filter.append("feGaussianBlur")
		.attr("in", "SourceAlpha")
		.attr("stdDeviation", thickness)
		.attr("result", "blur");

	    // Using the above's boundaries, make transparent black box.
	    filter.append("feFlood")
		.attr("flood-color", "rgba(0,0,0," + opacity + ")");

	    // Composite the transparent back box with the blur to make a lighter blur.
	    filter.append("feComposite")
		.attr("in2", "blur")
		.attr("operator", "in");

	    // Put the node on top of its drop-shadow.
	    var merge = filter.append("feMerge");

	    merge.append("feMergeNode");

	    merge.append("feMergeNode")
		.attr("in", "SourceGraphic");
	},

	standardDropShadow = defs.append("filter")
	    .attr("id", normalId)
	    .call(makeDropShadow, normalThickness, normalOpacity),

	emphasisFilter = defs.append("filter")
	    .attr("id", emphasizeId)
	    .call(makeDropShadow, emphasizeThickness, emphasizeOpacity),

	deemphasisFilter = defs.append("filter")
	    .attr("id", deEmphasizeId);

    deemphasisFilter.append("feGaussianBlur")
	.attr("in", "SourceGraphic")
	.attr("stdDeviation", 1);
    
    deemphasisFilter.append("feColourMatrix")
	.attr("type", "matrix")
	.attr("values", desaturatedMatrix.join(" "));
    
    return function(selection, newSelection) {
	selection.style("filter", function(d, i) {
	    if (d.effects.emphasize) {
		return asCSS(emphasizeId);
		return null;
	    } else if (d.effects.blurOut) {
		return asCSS(deEmphasizeId);
	    } else {
		return asCSS(normalId);
	    }
	});
    };
};
