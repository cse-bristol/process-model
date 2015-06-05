"use strict";

/*global module, require*/

var _ = require("lodash"),
    d3 = require("d3"),
    visibleIds = require("./visible-ids.js"),
    sizeCalculator = require("./size-calculator.js"),
    positionGraph = require("./position-graph.js"),
    viewModel = require("./view-model.js"),
    edgePath = require("./edge-path.js");

module.exports = function(getNodesCollection, getLayoutState, viewportState, margins) {
    return {
	getUpdatedViewModels: function() {
	    var nodesCollection = getNodesCollection(),
		layoutState = getLayoutState(),

		visibleIds = visibleIds(nodesCollection, layoutState.isVisible),

		sizes = sizeCalculator(
		    visibleIds,
		    margins.enabled(),
		    layoutState.size()
		),

		positions = positionGraph(
		    _.bind(visibleIds.has, visibleIds),
		    sizes,
		    nodesCollection,
		    layoutState
		),

		orientationCoords = layoutState.getOrientationCoords(),

		nodeViewModels = d3.map();

	    if (viewportState.hasSubTreeFocus() || viewportState.hasSingleNodeFocus()) {
		var emphasis = nodesCollection.descendents(
		    viewportState.getFocusNodeId()
		);
	    }

	    positions.nodes.forEach(function(id, position) {
		var size = sizes.get(id),
		    effects = {};

		if (emphasis) {
		    if (emphasis.has(id)) {
			effects.emphasize = true;
		    } else {
			effects.blurOut = true;
		    }
		}
		
		nodeViewModels.set(
		    id, 
		    viewModel.node(
			nodesCollection.get(id),
			size.size,
			size.margin,
			positions.get(id),
			layoutState.isCollapsed(id),
			orientationCoords,
			effects
		    )
		);
	    });

	    var edgeViewModels = positions.edges
		    .map(function(e) {
			var fromViewModel = nodeViewModels.get(e.fromId),
			    toViewModel = nodeViewModels.get(e.toId);
			
			return viewModel.edge(
			    e.edge,
			    edgePath(
				fromViewModel.edgeJunction,
				toViewModel.edgeEnd,
				layoutState.getOrientationCoords(),
				e.points
			    ),
			    layoutState.isCollapsed(e.fromId)
			);
		    });
	    
	    return {
		nodes: nodeViewModels.values(),
		edges: edgeViewModels
	    };

	}
    };
};
