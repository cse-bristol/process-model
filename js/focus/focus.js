"use strict";

/*global module, require*/

var d3 = require("d3"),
    actionFactory = require("./focus-action.js"),
    nodeChildrenSearchFactory = require("./node-children-search.js"),
    dataFactory = require("./focus-data.js"),
    emphasisFactory = require("./emphasis.js"),
    queryParam = "focus";

module.exports = function(getNodeCollection, svg, zoom, selectSVGNodes, queryString, update) {
    var data = dataFactory(),
	nodeChildrenSearch = nodeChildrenSearchFactory(getNodeCollection),
	focusAction = actionFactory(svg, zoom, selectSVGNodes),

	targetIds,

	recalc = function() {
	    if (data.underManualControl()) {
		targetIds = null;
		
	    } else if (data.hasSelectedNodeId()) {
		targetIds = nodeChildrenSearch(
		    data.getSelectedNodeId()
		);

	    } else {
		targetIds = getNodeCollection().ids();
	    }
	},

	markEmphasis = function(nodeViewModels) {
	    nodeViewModels.forEach(function(viewModel) {
		if (data.getSelectedNodeId() === viewModel.id) {
		    viewModel.emphasize = true;
		}
		viewModel.deEmphasize = targetIds && !targetIds.has(viewModel.id);
	    });	    
	},

	redraw = function() {
	    if (targetIds) {
		focusAction(targetIds);
	    }
	};

    zoom.on("zoomstart", function() {
	if (!zoom.manual) {
	    if (!data.underManualControl()) {
		data.clear();
		data.setManualControl(true);
		update();
	    }
	}
    });

    queryString.param(
	queryParam,
	// The read function is omitted here, because we're going to set up our focus during 'onSetModel' instead.
	null,
	function() {
	    return data.hasSelectedNodeId() ? data.getSelectedNodeId() : null;
	}
    );

    return {
	/*
	 Zoom out so that we can see every node in the model at once.
	 */
	zoomToExtent: function() {
	    data.clear();
	    update();
	},

	onSetModel: function() {
	    data.clear();

	    var focusNodeId = queryString.readParameter(queryParam);
	    
	    if (focusNodeId) {
		if (getNodeCollection().has(focusNodeId)) {
		    data.setSelectedNodeId(focusNodeId);
		} else {
		    update();
		}
	    }
	},

	/*
	 Recalc looks at the node graph and determines which ids are in the currently focused subtree.
	 */
	recalc: recalc,
	/*
	 MarkEmphasis adds information about focus to node view models. 
	 */
	markEmphasis: markEmphasis,

	/*
	 Redraw should be called after nodes have been positioned on the screen. It pans and zooms the screen.
	 */
	redraw: redraw
    };
};
