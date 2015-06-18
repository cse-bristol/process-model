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
    
    viewportFactory = require("./viewport/viewport.js"),
    
    empty = d3.select();


module.exports = function(body, svg, queryString, getNodeCollection, getLayoutState, update) {
    var background = svg.append("rect")
	    .attr("width", "100%")
	    .attr("height", "100%")
	    .attr("fill", "white")
	    .on("click", function() {
		if (!d3.event.defaultPrevented) {
		    viewport.uncentreNode();
		}
	    }),

	g = svg.append("g"),
	defs = g.append("defs"),

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

	viewport = viewportFactory(svg, g, queryString, getNodeCollection, update, transitions, selectNodes),

	transitions = transitionsFactory(),

	drawEdges = drawEdgesFactory(g, defs, getNodeCollection, transitions, update),

	drawNodes = drawNodesFactory(
	    g, defs,
	    getNodeCollection, getLayoutState, viewport,
	    transitions, drawEdges.drawEdges, redrawNode, selectNodes,
	    update
	),
	types = drawNodeTypesFactory(svg, redrawNode, transitions, viewport, getNodeCollection, getLayoutState, update),

	drawNodeMargin = drawMarginsFactory(getNodeCollection, getLayoutState, viewport, transitions, update),
	emphasis = emphasisFactory(defs),
	textEdit = textEditFactory(body, getNodeCollection, viewport, transitions, update);

    viewport.zoom.on("zoomend.updateTextOverlay", function() {
	textEdit.update(selectNodes());
    });

    return {
	update: function(viewModels) {
	    var nodes = drawNodes.draw(viewModels.nodes);
	    textEdit.update(nodes.nodes);
	    
	    drawNodeSubComponents(nodes.nodes, nodes.newNodes);

	    drawEdges.draw(viewModels.edges);
	    
	    viewport.update();
	},

	viewport: viewport
    };
};
