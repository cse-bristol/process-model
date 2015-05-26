"use strict";

/*global module, require*/

var d3 = require("d3"),
    actionFactory = require("./focus-action.js"),
    controlsFactory = require("./focus-control.js"),
    nodeChildrenSearchFactory = require("./node-children-search.js"),
    dataFactory = require("./focus-data.js");

module.exports = function(getNodeCollection, svg, selectSVGNodes, zoom, container, queryString, drawNodesHook, update) {
    var data = dataFactory(),
	nodeChildrenSearch = nodeChildrenSearchFactory(getNodeCollection),
	focusAction = actionFactory(svg, selectSVGNodes, zoom),
	controls = controlsFactory(container, drawNodesHook, data),

	targetIds,

	selectNodeAndCalcDepthLimit = function(id) {
	    var nodeChildren = nodeChildrenSearch(id);
	    
	    data.setDepthLimit(
		nodeChildren.maxDepthReached
	    );
	},

	recalc = function() {
	    if (data.hasSelectedNodeId()) {
		selectNodeAndCalcDepthLimit(data.getSelectedNodeId());

		targetIds = nodeChildrenSearch(
		    data.getSelectedNodeId(),
		    data.getDepth()
		).childIds;

	    } else {
		targetIds = getNodeCollection().ids();
	    }
	},

	redraw = function() {
	    focusAction(targetIds);
	    controls.update(data);
	};

    controls.onSelectNode(function(nodeId) {
	if (!nodeId || data.getSelectedNodeId === nodeId) {
	    return;
	}

	data.setSelectedNodeId(nodeId);

	update();
    });

    controls.onSetDepth(function(depth) {
	data.setDepth(depth);
	update();
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
	 Each draw cycle, the following should happen in order:
	 1. recalc is called, working out which nodes to focus on, and what the maximum depth should be.
	 2. The node graph is drawn, possibly looking at some data from (1).
	 3. redraw is called, panning and zooming to a box around some of the nodes drawn in (2) and updating the focus controls with the depth limit worked out in (1).
	 */
	recalc: recalc,
	redraw: redraw
    };
};
