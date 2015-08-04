"use strict";

/*global module, require*/

var _ = require("lodash"),
    d3 = require("d3"),
    sizeCalculator = require("./size-calculator.js"),
    positionGraph = require("./position-graph.js"),
    viewModel = require("./view-model.js"),
    edgePath = require("./edge-path.js");

module.exports = function(getNodesCollection, getLayoutState, viewpoint, margins) {
    return function() {
	var nodesCollection = getNodesCollection(),
	    layoutState = getLayoutState(),

	    visibleIds = nodesCollection.depthLookup.getVisibleIds(layoutState.depth()),

	    sizes = sizeCalculator(
		visibleIds,
		margins.enabled(),
		viewpoint.getCentredNodeId(),
		layoutState.size()
	    ),

	    positions = positionGraph(
		_.bind(visibleIds.has, visibleIds),
		sizes,
		nodesCollection,
		layoutState
	    ),

	    orientationCoords = layoutState.getOrientationCoords(),

	    nodeViewModels = d3.map(),

	    emphasis = viewpoint.getEmphasis();

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
		    size.margins,
		    positions.nodes.get(id),
		    nodesCollection.depthLookup.isBorderNode(layoutState.depth(), id),
		    orientationCoords,
		    margins.enabled(),
		    viewpoint.getCentredNodeId() === id,
		    effects
		)
	    );
	});

	var edgeViewModels = positions.edges
		.map(function(e, i) {
		    var fromViewModel = nodeViewModels.get(e.fromId),
			toViewModel = nodeViewModels.get(e.toId),

			targetHasOnlyOneParent = nodesCollection.edgesToNode(
			    nodesCollection.get(
				e.toId
			    )
			).length === 1;

		    return viewModel.edge(
			e.edge,
			edgePath(
			    fromViewModel.edgeJunction,
			    toViewModel.edgeEnd,
			    layoutState.getOrientationCoords(),
			    e.points
			),
			nodesCollection.depthLookup.isBorderNode(layoutState.depth(), e.fromId),
			margins.enabled(),
			targetHasOnlyOneParent
		    );
		});
	
	return {
	    nodes: nodeViewModels.values(),
	    edges: edgeViewModels
	};
    };
};
