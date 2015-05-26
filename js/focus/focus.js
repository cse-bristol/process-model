"use strict";

/*global module, require*/

var d3 = require("d3"),
    actionFactory = require("./focus-action.js"),
    controlsFactory = require("./focus-control.js"),
    nodeChildrenSearchFactory = require("./node-children-search.js"),
    dataFactory = require("./focus-data.js");

module.exports = function(getNodeCollection, svg, selectSVGNodes, zoom, container, queryString, drawNodesHook) {
    var data = dataFactory(),
	nodeChildrenSearch = nodeChildrenSearchFactory(getNodeCollection),
	focusAction = actionFactory(svg, selectSVGNodes, zoom),
	controls = controlsFactory(container, drawNodesHook),

	selectNodeAndCalcDepthLimit = function(id) {
	    var nodeChildren = nodeChildrenSearch(id);
	    
	    data.setSelectedNodeIdAndDepthLimit(
		id,
		nodeChildren.maxDepthReached
	    );
	},

	update = function() {
	    var targetIds;

	    if (data.hasSelectedNodeId()) {
		selectNodeAndCalcDepthLimit(data.getSelectedNodeId());

		targetIds = nodeChildrenSearch(
		    data.getSelectedNodeId(),
		    data.getDepth()
		).childIds;

	    } else {
		targetIds = getNodeCollection().ids();
	    }

	    focusAction(targetIds);
	    controls.update(data);
	};

    controls.onSelectNode(function(nodeId) {
	if (!nodeId || data.getSelectedNodeId === nodeId) {
	    return;
	}

	selectNodeAndCalcDepthLimit(nodeId);

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
		selectNodeAndCalcDepthLimit(roots[0]);
	    }
	    
	    update();
	},

	update: update
    };
};
