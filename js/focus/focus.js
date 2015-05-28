"use strict";

/*global module, require*/

var d3 = require("d3"),
    actionFactory = require("./focus-action.js"),
    controlsFactory = require("./focus-control.js"),
    nodeChildrenSearchFactory = require("./node-children-search.js"),
    dataFactory = require("./focus-data.js"),
    emphasisFactory = require("./emphasis.js");

module.exports = function(getNodeCollection, svg, zoom, selectSVGNodes, queryString, update, drawNodeHooks) {
    var data = dataFactory(),
	nodeChildrenSearch = nodeChildrenSearchFactory(getNodeCollection),
	focusAction = actionFactory(svg, zoom, selectSVGNodes),
	controls = controlsFactory(drawNodeHooks),
	emphasis = emphasisFactory(svg, drawNodeHooks),

	targetIds,

	recalc = function(nodeViewModels) {
	    if (data.underManualControl()) {
		targetIds = null;
		
	    } else if (data.hasSelectedNodeId()) {
		targetIds = nodeChildrenSearch(
		    data.getSelectedNodeId()
		);

	    } else {
		targetIds = getNodeCollection().ids();
	    }

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

    controls.onSelectNode(function(nodeId) {
	if (!nodeId || data.getSelectedNodeId === nodeId) {
	    return;
	}

	data.setSelectedNodeId(nodeId);

	update();
    });

    zoom.on("zoomstart", function() {
	if (!zoom.manual) {
	    if (!data.underManualControl()) {
		data.clear();
		data.setManualControl(true);
		update();
	    }
	}
    });

    return {
	/*
	 This should happen after we have done the drawing phase for this model.
	 */
	onSetModel: function() {
	    data.clear();
	    // ToDo maybe look at query string here?

	    var nodes = getNodeCollection(),
		roots = nodes.nodesWithoutParents();
	    
	    if (roots.length === 1) {
		data.setSelectedNodeId(roots[0]);
	    }
	},

	/*
	 Zoom out so that we can see every node in the model at once.
	 */
	zoomToExtent: function() {
	    data.clear();
	    update();
	},

	/*
	 Each draw cycle, the following should happen in order:
	 1. recalc is called, working out which nodes to focus on
	 2. The node graph is drawn, possibly looking at some data from (1) to emphasize particular nodes.
	 3. redraw is called, panning and zooming to a box around some of the nodes drawn in (2).
	 */
	recalc: recalc,
	redraw: redraw
    };
};
