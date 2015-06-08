"use strict";

/*global module, require*/

var d3 = require("d3"),

    transitionsFactory = require("./transition-switch.js"),
    drawEdgesFactory = require("./draw-edge.js"),
    drawNodesFactory = require("./draw-node.js"),
    drawNodeTypesFactory = require("./node-types/draw-node-types.js"),
    drawMarginsFactory = require("./draw-node-margin.js"),
    emphasisFactory = require("./emphasis.js"),
    textControlsFactory = require("zenpen-toolbar"),
    viewportFactory = require("./viewport/viewport.js"),
    
    empty = d3.select();


module.exports = function(body, svg, queryString, textEditor, getNodeCollection, getLayoutState, update) {
    var g = svg.append("g"),
	defs = g.append("defs"),

	drawNodeSubComponents = function(nodes, newNodes) {
	    var margins = drawNodeMargin(nodes, newNodes);

	    types.draw(nodes, newNodes, margins.bottomMargins, margins.newBottomMargins);
	    emphasis(nodes, newNodes);
	},

	redrawNode = function(toRedraw) {
	    drawNodes.redrawNode(toRedraw, empty);
	    drawNodeSubComponents(toRedraw, empty);
	},	

	transitions = transitionsFactory(),
	drawEdges = drawEdgesFactory(g, defs, getNodeCollection, transitions, update),

	drawNodes = drawNodesFactory(
	    g, defs,
	    getNodeCollection, getLayoutState,
	    transitions, drawEdges.drawEdges, redrawNode,
	    update
	),
	types = drawNodeTypesFactory(svg, redrawNode, transitions, getNodeCollection, getLayoutState, update),

	viewport = viewportFactory(svg, g, textEditor, queryString, getNodeCollection, update, transitions, drawNodes.selectNodes),
	
	drawNodeMargin = drawMarginsFactory(getNodeCollection, getLayoutState, viewport, update),
	emphasis = emphasisFactory(defs),
	textControls = textControlsFactory(body);

    return {
	update: function(viewModels) {
	    var nodes = drawNodes.draw(viewModels.nodes);
	    drawNodeSubComponents(nodes.nodes, nodes.newNodes);

	    drawEdges.draw(viewModels.edges);
	    
	    viewport.update();
	    textControls.update();
	},

	viewport: viewport
    };
};
