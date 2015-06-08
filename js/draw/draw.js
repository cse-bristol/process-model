"use strict";

/*global module, require*/

var transitionsFactory = require("./transition-switch.js"),
    drawEdgesFactory = require("./draw-edge.js"),
    drawNodesFactory = require("./draw-node.js"),
    drawNodeTypesFactory = require("./nodes/node-types/draw-node-types.js"),
    drawMarginsFactory = require("./draw-node-margin.js"),
    emphasisFactory = require("./emphasis.js"),
    zoomFactory = require("./zoom.js"),
    textControlsFactory = require("zenpen-toolbar");


module.exports = function(body, svg, getNodeCollection, getLayoutState, viewportState, update) {
    var g = svg.append("g"),
	defs = g.append("defs"),

	transitions = transitionsFactory(),
	drawEdges = drawEdgesFactory(g, defs, getNodeCollection, transitions, update),
	drawNodes = drawNodesFactory(
	    g, defs,
	    getNodeCollection, getLayoutState, viewportState,
	    transitions, drawEdges.drawEdges,
	    update
	),
	types = drawNodeTypesFactory(svg, drawNodes.redrawNode, transitions, getNodeCollection, getLayoutState, update),
	
	drawNodeMargin = drawMarginsFactory(getNodeCollection, getLayoutState, viewportState, update),
	emphasis = emphasisFactory(defs),
	textControls = textControlsFactory(body),
	zoom = zoomFactory(svg, g, textControls);

    return {
	update: function(viewModels) {
	    var nodes = drawNodes(viewModels.nodes),
		margins = drawNodeMargin(nodes.nodes, nodes.newNodes);

	    types.draw(nodes.nodes, nodes.newNodes, margins.bottomMargins, margins.newBottomMargins);
	    emphasis(nodes.nodes, nodes.newNodes);

	    drawEdges(viewModels.edges);
	    
	    zoom.update();
	    textControls.update();
	}
    };
};
