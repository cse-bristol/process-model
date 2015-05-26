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

	update = function() {
	    focusAction(
		nodeChildrenSearch(
		    data.getSelectedNodeId(),
		    data.getDepth()
		).childIds
	    );
	};

    controls.onSelectNode(function(nodeId) {
	if (!nodeId || data.getSelectedNodeId === nodeId) {
	    return;
	}
	
	data.setSelectedNodeId(nodeId);
	controls.enableDepthTools();

	var nodeChildren = nodeChildrenSearch(
	    data.getSelectedNodeId());

	data.limitDepth(nodeChildren.maxDepthReached);
	
	focusAction(nodeChildren.childIds);
    });

    controls.onChangeDepth(function(depthChange) {
	if (!data.hasSelectedNodeId()) {
	    return;
	}

	var nodeChildren = nodeChildrenSearch(
	    data.getSelectedNodeId());
	
	if (data.hasDepth()) {
	    var newDepth = data.getDepth() + depthChange;

	    newDepth = Math.max(0, newDepth);
	    newDepth = Math.min(nodeChildren.maxDepthReached, newDepth);
	    
	    if (newDepth === data.getDepth()) {
		return;
	    } else {
		data.setDepth(newDepth);
		update();
	    }
	} else {
	    data.setDepth(nodeChildren.maxDepthReached);
	    focusAction(nodeChildren.childIds);
	}
    });

    return {
	/*
	 This should happen after we have done the drawing phase for this model.
	 */
	onSetModel: function() {
	    data.clear();
	    controls.disableDepthTools();
	    // ToDo maybe look at query string here?
	    
	    // ToDo this is clearly wrong since it will trigger on save as.
	    focusAction(getNodeCollection().ids());
	},

	update: update
    };
};
