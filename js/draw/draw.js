"use strict";

/*global module, require*/

var transitionsFactory = require("./transition-switch.js"),
    drawEdgesFactory = require("./draw-edge.js"),
    drawNodesFactory = require("./draw-node.js"),
    zoomFactory = require("./zoom.js"),
    textControlsFactory = require("zenpen-toolbar");


module.exports = function(body, svg, getNodesCollection, getLayoutState, viewportState, update) {
    var g = svg.append("g"),
	defs = g.append("defs"),

	transitions = transitionsFactory(),
	drawEdges = drawEdgesFactory(g, defs, getNodesCollection, transitions, update),
	drawNodes = drawNodesFactory(
	    g, defs,
	    getNodesCollection, getLayoutState, viewportState,
	    transitions, drawEdges.drawEdges,
	    update
	),
	textControls = textControlsFactory(body),
	zoom = zoomFactory(svg, g, textControls);

    return {
	update: function(viewModels) {
	    drawNodes(viewModels.nodes);

	    // ToDo margins
	    // ToDo emphasis
	    
	    drawEdges(viewModels.edges);
	    
	    zoom.update();
	    textControls.update();
	}
    };

    // ToDo node specific drawings - this probably needs splitting up a lot
    require("./nodes/draw-process-node.js")(g, drawNodes, model.getNodes, model.getLayout, transitions, update);
};
