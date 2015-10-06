"use strict";

/*global module, require*/

var d3 = require("d3"),
    helpers = require("../../helpers.js"),
    callbacks = helpers.callbackHandler,    

    zoomFactory = require("./zoom.js"),    
    zoomToFitFactory = require("./zoom-to-fit-nodes.js"),
    zoomButtonFactory = require("./zoom-buttons.js"),
    fitButtonFactory = require("./fit-button.js"),
    saveViewpointButtonFactory = require("./save-viewpoint-button.js"),
    loadViewpointButtonFactory = require("./load-viewpoint-button.js"),

    viewpointHistoryFactory = require("./viewpoint-history.js"),

    queryParam = "focus";

module.exports = function(svg, g, queryString, getNodeCollection, getSavedViewpoint, setSavedViewpoint, onViewpointSaved, update, transitions, getSVGNodes) {
    /*
     Viewpoint maintains its only copy of the viewport state, detached from the model itself.
     */
    var state = viewpointHistoryFactory(),
	zoom = zoomFactory(svg, g),
	zoomToFit = zoomToFitFactory(svg, zoom, getSVGNodes),
	
	viewpointChanging = false,
	zooming = false,

	loadViewpointButton;

    zoom.on("zoom.setManualPosition", function() {
	if (zoom.changed() && !viewpointChanging) {
	    var thenUpdate = !state.hasManualPosition();

	    state.setManualPosition(
		zoom.scale(),
		zoom.translate()
	    );

	    if (thenUpdate) {
		zooming = true;
		try {
		    update();
		} finally {
		    zooming = false;
		}
	    }
	}
    })
	.on("zoomend.setManualPosition", function() {
	    if (zoom.changed() && viewpointChanging) {
		viewpointChanging = false;
	    }
	});

    return {
	update: function() {
	    if (zooming) {
		// We're in the middle of a manual zoom, so we shouldn't try to focus on anything.
		return;
	    }

	    viewpointChanging = true;
	    
	    if (state.isCentredOnNode()) {
		zoomToFit(
		    d3.set([
			state.getCentredNodeId()
		    ])
		);
		
	    } else if (state.hasSubTreeFocus()) {
		zoomToFit(
		    getNodeCollection()
			.descendentIds(
			    state.getSubTreeFocus()
			)
		);
		
	    } else if (state.hasManualPosition()) {
		zoom.scaleTranslate(
		    state.getManualScale(),
		    state.getManualTranslate()
		);

	    } else {
		zoomToFit(
		    getNodeCollection()
			.ids()
		);
	    }

	    if (loadViewpointButton) {
		loadViewpointButton.update();
	    }
	},

	getSerializedState: function() {
	    return state.getCurrentState().serialize();
	},

	centreNode: function(nodeId) {
	    state.centreNode(nodeId);
	    update();
	},

	clearCentreAndFocus: function() {
	    state.clearCentreAndFocus();
	    update();
	},

	getCentredNodeId: function() {
	    if (state.isCentredOnNode()) {
		return state.getCentredNodeId();
	    } else {
		return null;
	    }
	},

	focusSubTree: function(nodeId) {
	    if (state.hasSubTreeFocus() && state.getSubTreeFocus() === nodeId) {
		state.clearCentreAndFocus();
	    } else {
		state.focusSubTree(nodeId);
	    }
	    update();
	},

	makeZoomButtons: function(toolbar) {
	    return zoomButtonFactory(
		toolbar,
		zoom,
		update
	    );
	},

	makeFitButton: function(toolbar) {
	    return fitButtonFactory(
		toolbar,
		function() {
		    return state.hasWholeModelView();
		},
		function() {
		    state.setWholeModelView();
		    update();
		},
		function() {
		    state.clearWholeModelView();
		    update();
		}
	    );
	},

	makeSetViewpointButton: function(makeButton, setSavedViewpoint) {
	    return saveViewpointButtonFactory(
		makeButton,
		function() {
		    return state.getCurrentState();
		},
		setSavedViewpoint
	    );
	},

	makeLoadViewpointButton: function(toolbar) {
	    loadViewpointButton =  loadViewpointButtonFactory(
		toolbar,
		getSavedViewpoint,
		state.pushSavedState,
		onViewpointSaved,
		update
	    );
	},

	getEmphasis: function() {
	    if (state.isCentredOnNode()) {
		return d3.set([
		    state.getCentredNodeId()
		]);
		
	    } else if (state.hasSubTreeFocus()) {
		return getNodeCollection()
		    .descendentIds(
			state.getSubTreeFocus()
		    );
		
	    } else {
		return null;
	    }
	},

	onSetModel: function() {
	    var focusNodeId = queryString.readParameter(queryParam);

	    if (focusNodeId && getNodeCollection().has(focusNodeId)) {
		state.focusSubTree(focusNodeId);
	    } else {
		state.reset();
		
		state.pushSavedState(
		    getSavedViewpoint()
		);
	    }
	},

	zoom: zoom
    };
};
