"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Wraps a d3 zoom behaviour with some custom additions.

 + modelSVG is the element which will receive the zoom events for the model.
 + modelG is a g element inside the modelSVG which will have a pan and zoom applied to it as a transform.
 */
module.exports = function(modelSVG, modelG, textControls) {
    var zoom = d3.behavior.zoom()
	    .on("zoom", function() {
		modelG.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		// textControls.update();
	    });

    zoom.scaleTranslate = function(scale, translate) {
	zoom
	    .scale(scale)
	    .translate(translate)
	    .event(modelG.transition());
    };

    zoom.in = function() {
	zoom.scaleTranslate(zoom.scale() * 1.1);
    };
    zoom.out = function() {
	zoom.scaleTranslate(zoom.scale() / 1.1);
    };

    zoom.bbox = function(targetBBox) {
	var svgStyles = window.getComputedStyle(modelSVG.node()),
	    svgSize = {
		width: parseInt(svgStyles.width),
		height: parseInt(svgStyles.height)
	    },

	    widthScale = svgSize.width / targetBBox.width,
	    heightScale = svgSize.height / targetBBox.height,
	    scale = Math.min(widthScale, heightScale),
	    scaledTargetCentre = [
		(targetBBox.left + targetBBox.right) * scale / 2,
		(targetBBox.top + targetBBox.bottom) * scale / 2
	    ];

	zoom.scaleTranslate(
	    scale,
	    [
		(svgSize.width / 2) - scaledTargetCentre[0],
		(svgSize.height / 2) - scaledTargetCentre[1]
	    ]
	);
    };

    zoom(modelSVG);
    modelSVG.on("dblclick.zoom", null);

    return zoom;
};
