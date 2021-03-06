"use strict";

/*global module, require*/

var d3 = require("d3"),

    transitionsFactory = require("./transition-switch.js"),
    drawEdgesFactory = require("./draw-edge.js"),
    drawNodesFactory = require("./draw-node.js"),
    drawNodeTypesFactory = require("./node-types/draw-node-types.js"),
    drawMarginsFactory = require("./draw-node-margin.js"),
    emphasisFactory = require("./emphasis.js"),

    textEditFactory = require("./text-edit/text-edit.js"),
    
    viewpointFactory = require("./viewpoint/viewpoint.js"),
    
    empty = d3.select();

module.exports = function(body, svg, queryString, getNodeCollection, getLayoutState, getSavedViewpoint, setSavedViewpoint, onViewpointSaved, writeBufferedOperations, update) {
    var background = svg.append("rect")
	    .attr("width", "100%")
	    .attr("height", "100%")
	    .attr("fill", "white")
	    .on("click", function() {
		if (!d3.event.defaultPrevented) {
		    viewpoint.clearCentreAndFocus();
		}
	    }),

	g = svg.append("g"),
	defs = g.append("defs"),
	/*
	 Store the last set of view models we looked at. We need to know this so that we can work out what position the text editor transitioned from.
	 */
	pastNodeViewModels,

	drawNodeSubComponents = function(nodes, newNodes) {
	    var margins = drawNodeMargin(nodes, newNodes);

	    types.draw(nodes, newNodes, margins.bottomMargins, margins.newBottomMargins);
	    emphasis(nodes, newNodes);
	},

	selectNodes = function() {
	    return g.selectAll("g.process-node")
	    	.filter(function(d, i) {
		    return !d3.select(this).classed("removing");
		});
	},

	redrawNode = function(toRedraw) {
	    drawNodes.redrawNode(toRedraw, empty);
	    textEdit.update(toRedraw);
	    drawNodeSubComponents(toRedraw, empty);
	},

	viewpoint = viewpointFactory(svg, g, queryString, getNodeCollection, getSavedViewpoint, setSavedViewpoint, onViewpointSaved, update, transitions, selectNodes),

	transitions = transitionsFactory(),

	drawEdges = drawEdgesFactory(g, defs, getNodeCollection, transitions, update),

	drawNodes = drawNodesFactory(
	    g, defs,
	    getNodeCollection, getLayoutState, viewpoint,
	    transitions, drawEdges.drawEdges, redrawNode, selectNodes,
	    update
	),
	types = drawNodeTypesFactory(g, redrawNode, transitions, viewpoint, getNodeCollection, getLayoutState, update),

	drawNodeMargin = drawMarginsFactory(getNodeCollection, getLayoutState, viewpoint, transitions, update),
	emphasis = emphasisFactory(defs),
	textEdit = textEditFactory(body, getNodeCollection, viewpoint, transitions, writeBufferedOperations, update);

    viewpoint.zoom.on("zoomend.updateTextOverlay", function() {
	textEdit.update(selectNodes(), pastNodeViewModels);
    });

    return {
	update: function(viewModels) {
	    var nodes = drawNodes.draw(viewModels.nodes);
	    textEdit.update(nodes.nodes, pastNodeViewModels);
	    
	    drawNodeSubComponents(nodes.nodes, nodes.newNodes);

	    drawEdges.draw(viewModels.edges);
	    
	    viewpoint.update();

	    pastNodeViewModels = viewModels.nodes;
	},

	viewpoint: viewpoint
    };
};
