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

    emphasizeId = "drop-shadow";

module.exports = function(svg, drawNodeHook) {
    var asCSS = function(elementId) {
	    return "url(#" + elementId + ")";
	},

	setEmphasis = function(selection, newSelection) {
	    selection.style("filter", function(d, i) {
		console.log(d, d.emphasize, d.deEmphasize);
		
		if (d.emphasize) {
		    return asCSS(emphasizeId);
		    return null;
		} else if (d.deEmphasize) {
		    return asCSS(deEmphasizeId);
		} else {
		    return null;
		}
	    });
	};

    var deemphasisFilter = svg.append("filter")
	    .attr("id", deEmphasizeId),

	emphasisFilter = svg.append("filter")
	    .attr("id", emphasizeId);

    deemphasisFilter.append("feGaussianBlur")
	.attr("in", "SourceGraphic")
	.attr("stdDeviation", 1);
    
    deemphasisFilter.append("feColourMatrix")
	.attr("type", "matrix")
	.attr("values", desaturatedMatrix.join(" "));

    // Make a blurred version of the node.
    emphasisFilter.append("feGaussianBlur")
	.attr("in", "SourceAlpha")
	.attr("stdDeviation", 3);

    // Offset it slightly.
    emphasisFilter.append("feOffset")
	.attr("dx", 2)
	.attr("dy", 3);

    var emphasisMerge = emphasisFilter.append("feMerge");

    emphasisMerge.append("feMergeNode");

    emphasisMerge.append("feMergeNode")
	.attr("in", "SourceGraphic");
	

    drawNodeHook(setEmphasis);

    return {
	clearFocus: setEmphasis
    };
};
