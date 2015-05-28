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
		textControls.update();
	    });

    zoom.scaleTranslate = function(scale, translate) {
	zoom.manual = true;

	zoom
	    .scale(scale)
	    .translate(translate)
	    .event(modelG.transition());
    };

    zoom.on("zoomend", function() {
	zoom.manual = false;
    });

    zoom.in = function() {
	zoom.scaleTranslate(zoom.scale() * 1.1);
    };
    zoom.out = function() {
	zoom.scaleTranslate(zoom.scale() / 1.1);
    };

    zoom.bbox = function(targetBBox) {
	var svgBBox = modelSVG.node().getBoundingClientRect(),
	    widthScale = svgBBox.width / targetBBox.width,
	    heightScale = svgBBox.height / targetBBox.height,
	    scale = Math.min(widthScale, heightScale),
	    scaledTargetCentre = [
		(targetBBox.left + targetBBox.right) * scale / 2,
		(targetBBox.top + targetBBox.bottom) * scale / 2
	    ];

	zoom.scaleTranslate(
	    scale,
	    [
		(svgBBox.width / 2) - scaledTargetCentre[0],
		(svgBBox.height / 2) - scaledTargetCentre[1]
	    ]
	);
    };

    zoom(modelSVG);
    modelSVG.on("dblclick.zoom", null);

    return zoom;
};
    






