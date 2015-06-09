"use strict";

/*global module, require*/

var d3 = require("d3"),

    stateFactory = require("./viewport-state.js"),
    zoomFactory = require("./zoom.js"),    
    zoomToFitFactory = require("./zoom-to-fit-nodes.js"),
    fitButtonFactory = require("./fit-button.js"),

    queryParam = "focus";

module.exports = function(svg, g, textEditor, queryString, getNodeCollection, update, transitions, getSVGNodes) {
    var state = stateFactory(),
	zoom = zoomFactory(svg, g, textEditor),
	zoomToFit = zoomToFitFactory(svg, zoom, getSVGNodes),
	
	viewportChanging = false,
	zooming = false;

    zoom.on("zoomend.setManualPosition", function() {
	if (zoom.changed()) {
	    if (viewportChanging) {
		viewportChanging = false;
		
	    } else {
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
	}
    });

    // ToDo sort out text editor
    // textEditor.onClose(function() {
    // 	state.uncentreNode();
    // 	update);
    // });

    queryString.param(
	queryParam,
	// The read function is omitted here, because we're going to set up our focus during 'onSetModel' instead.
	null,
	function() {
	    return state.hasSubTreeFocus() ? state.getSubTreeFocus() : null;
	}
    );

    return {
	update: function() {
	    if (zooming) {
		// We're in the middle of a manual zoom, so we shouldn't try to focus on anything.
		return;
	    }
	    
	    viewportChanging = true;
	    
	    if (state.isCentredOnNode()) {
		zoomToFit(
		    d3.set(
			state.getCentredNodeId()
		    )
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
	},

	centreNode: function(nodeId) {
	    state.centreNode(nodeId);
	    update();
	},

	focusSubTree: function(nodeId) {
	    state.focusSubTree(nodeId);
	    update();
	},

	makeFitButton: function(makeToggle) {
	    return fitButtonFactory(
		makeToggle,
		state.hasWholeModelView,
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

	getEmphasis: function() {
	    if (state.isCentredOnNode()) {
		return d3.set(
		    state.getCentredNodeId()
		);
		
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

	    state.setWholeModelView();
	    
	    if (focusNodeId && getNodeCollection().has(focusNodeId)) {
		state.focusSubTree(focusNodeId);
	    }
	}
    };
};
