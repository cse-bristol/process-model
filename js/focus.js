"use strict";

/*global module, require*/

var tolerance = 20;

module.exports = function(getNodeCollection, svg, selectSVGNodes, zoom) {

    var calcExtent = function(nodeIds) {
	var bbox;
	
	selectSVGNodes()
	    .each(function(d, i) {
		if (nodeIds.has(d.id)) {
		    var right = d.x + d.size[0],
			bottom = d.y + d.size[1];
		    
		    if (bbox === undefined) {
			bbox = {
			    left: d.x,
			    right: right,
			    top: d.y,
			    bottom: bottom
			};
		    } else {
			if (bbox.left > d.x) {
			    bbox.left = d.x;
			}

			if (bbox.right < right) {
			    bbox.right = right;
			}
			
			if (bbox.top > d.y) {
			    bbox.top = d.y;
			}

			
			if (bbox.bottom < bottom) {
			    bbox.bottom = bottom;
			}
		    }
		}
	    });

	if (bbox) {
	    bbox.left -= tolerance;
	    bbox.right += tolerance;
	    bbox.top -= tolerance;
	    bbox.bottom += tolerance;

	    bbox.width = bbox.right - bbox.left;
	    bbox.height = bbox.bottom - bbox.top;
	}

	return bbox;
    },

	calcPanAndZoom = function(modelBBox) {
	    var svgBBox = svg.node().getBoundingClientRect(),
		widthScale = svgBBox.width / modelBBox.width,
		heightScale = svgBBox.height / modelBBox.height,
		scale = Math.min(widthScale, heightScale),
		scaledModelCentre = [
		    (modelBBox.left + modelBBox.right) * scale / 2,
		    (modelBBox.top + modelBBox.bottom) * scale / 2
		];

	    return {
		scale: scale,
		translate: [
		    (svgBBox.width / 2) - scaledModelCentre[0],
		    (svgBBox.height / 2) - scaledModelCentre[1]
		]
	    };
	},

	doPanAndZoom = function(panAndZoom) {
	    zoom.scale(panAndZoom.scale);
	    zoom.translate(panAndZoom.translate);
	    zoom.go();
	},

	showAll = function() {
	    var modelExtent = calcExtent(
		getNodeCollection().ids());

	    if (modelExtent) {
		doPanAndZoom(
		    calcPanAndZoom(modelExtent)
		);
	    }
	};

    return {
	showAll: showAll
    };
};
