"use strict";

/*global parent, require*/

var update = function() {
    if (model.empty()) {
	model.set(model.freshModel());
    }

    focus.recalc();
    draw();
    exportButton.update();
    textControls.update();
    focus.redraw();

};

var d3 = require("d3"),
    URL = require("url"),
    body = d3.select("body"),
    toolbar = body.append("div")
	.attr("id", "toolbar"),
    svg = d3.select("svg#model"),
    g = svg.append("g"),
    defs = g.append("defs"),
    helpers = require("./helpers.js"),
    callbacks = helpers.callbackHandler,
    model = require("./model.js")(),
    layoutStateFactory = require("./layout/layout-state.js"),
    positionGraph = require("./layout/position-graph.js"),
    transitions = require("./transition-switch.js")(),
    jsonData = require("./data/json.js"),
    perimetaDeserialize = require("./data/perimeta-xml.js"),
    helpLink = d3.select("#help"),
    textControls = require("zenpen-toolbar")(body),
    drawEdges = require("./nodes/draw-edge.js")(g, defs, model.getNodes, transitions, update),
    drawNodes = require("./nodes/draw-node.js")(
	g, defs, model.getNodes, model.getLayout, transitions, textControls, drawEdges.drawEdges,
	update
    ),    
    zoom = d3.behavior.zoom()
	.on("zoom", function() {
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	    textControls.update();
	}),
    files = require("./files.js"),

    shortcutKeys = require("./keys.js")(helpLink, zoom, update, model.getNodes),

    fileMenu = require("multiuser-file-menu")(
	"process-models",
	jsonData.serialize,
	jsonData.deserialize,
	model.get,
	model.set,
	model.freshModel
    ),

    focus = require("./focus/focus.js")(model.getNodes, svg, drawNodes.selectNodes, zoom, body, null, drawNodes.drawNodesHook, update),

    modelOperations = require("./data/model-operations.js")(fileMenu.store.writeOp, fileMenu.store.onOp, model.getNodes, model.getLayout, model.set, model.onSet, update),
    exportButton = require("./export-button.js")(
	fileMenu.standard.getTitle,
	fileMenu.standard.onTitleChange,
	jsonData.serialize,
	model.get,
	fileMenu.spec.button
    ),
    insertButton = require("./insert-button.js")(
	fileMenu.store.loadSnapshot,
	model.merge,
	update,
	fileMenu.spec.button),
    layoutButton = require("./reset-layout-button.js")(fileMenu.spec.button, model.getLayout, update),
    rotateButton = require("./layout/rotate-button.js")(fileMenu.spec.button, model.getLayout, update);

fileMenu.buildMenu(toolbar, [insertButton, exportButton.spec, layoutButton, rotateButton]);

model.onSet(function() {
    focus.onSetModel();
    update();
});


zoom.scaleTranslate = function(scale, translate) {
    zoom.manual = true;

    g.transition()
	.call(function(selection) {
	    zoom
		.scale(scale)
		.translate(translate)
		.event(selection);
	});
};

zoom.on("zoomend", function() {
    zoom.manual = false;
});

zoom.in = function() {
    zoom.scaleTranslate(zoom.scale() * 1.1);
};
zoom.out = function() {
    zoom.scaleTranslate(zoom.scale() / 1.1);
};

require("./nodes/draw-process-node.js")(g, drawNodes, model.getNodes, model.getLayout, transitions, update);
zoom(svg);
svg.on("dblclick.zoom", null);

var draw = function() {
    var display = positionGraph(
	model.getNodes(),
	model.getLayout()
    );

    drawNodes.draw(display.nodes);
    drawEdges.draw(display.edges);
};

var fromJson = function(fileName, content){
    model.set(
	jsonData.deserialize(
	    JSON.parse(content)));
};
fromJson.extensions = ["json"];

var fromXML = function(fileName, content) {
    var nodes = perimetaDeserialize(content);
    
    model.set({
	nodes: nodes,
	layout: layoutStateFactory(nodes)
    });
};
fromXML.extensions = ["xml"];

files.drop(svg, [fromJson, fromXML]);

fileMenu.queryString.fromURL();
