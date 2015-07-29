"use strict";

/*global module, require*/

var d3 = require("d3"),
    _ = require("lodash"),

    helpers = require("../../helpers.js"),
    callbacks = helpers.callbackHandler,

    epsilon = Math.pow(2, -20),

    zoomScale = 1.5;

/*
 Wraps a d3 zoom behaviour with some custom additions.

 + modelSVG is the element which will receive the zoom events for the model.
 + modelG is a g element inside the modelSVG which will have a pan and zoom applied to it as a transform.
 */
module.exports = function(modelSVG, modelG) {
    var onZoom = callbacks(),
    
	zoom = d3.behavior.zoom()
	    .on("zoom", function() {
		modelG.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		onZoom(d3.event.translate, d3.event.scale);
	    })
	    .on("zoomstart.record", function() {
		zoom.previousScale = zoom.scale();
		zoom.previousTranslate = zoom.translate();
	    }),

	closeEnough = function(a, b) {
	    return Math.abs(a - b) < epsilon;
	};

    zoom.changed = function() {
	var result = !(
	    closeEnough(zoom.scale(), zoom.previousScale) &&
		closeEnough(zoom.translate()[0], zoom.previousTranslate[0]) &&
		closeEnough(zoom.translate()[1], zoom.previousTranslate[1])
	);
	
	return result;
    };

    zoom.scaleTranslate = function(scale, translate) {
	if (scale) {
	    zoom.scale(scale);
	}

	if (translate) {
	    zoom.translate(translate);
	}

	zoom.event(modelG.transition());
    };

    zoom.in = function() {
	zoom.scaleTranslate(zoom.scale() * zoomScale);
    };
    zoom.out = function() {
	zoom.scaleTranslate(zoom.scale() / zoomScale);
    };

    zoom.onZoom = onZoom.add;

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
