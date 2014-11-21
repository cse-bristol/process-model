"use strict";

/*global parent, require*/

var update = function() {
    if (model.empty()) {
	model.set(model.freshModel());
    }
    
    draw();
    updateExportLink();
    textControls.update();

}, withUpdate = function(f) {
    return function(args) {
	f(args);
	update();
    };
};

var d3 = require("d3"),
    URL = require("url"),
    body = d3.select("body"),
    toolbar = body.append("div")
	.attr("id", "toolbar"),
    svg = d3.select("svg#model"),
    g = svg.append("g"),
    helpers = require("./helpers.js"),
    callbacks = helpers.callbackHandler,
    createLayout = require("./layout.js"),
    model = require("./model.js")(),
    selection = require("./selection.js")(model.onSet, model.getNodes),
    transitions = require("./transition-switch.js")(),
    jsonData = require("./data/json.js"),
    perimetaDeserialize = require("./data/perimeta-xml.js"),
    helpLink = d3.select("#help"),
    textControls = require("./text-toolbar.js")(body, svg, transitions),
    messages = require("./messages.js")(body, update),
    drawNodes = require("./nodes/draw-node.js")(g, transitions, textControls,
						withUpdate(selection.selected),
						update),
    drawEdges = require("./draw-edge.js")(g, transitions, update),
    zoom = d3.behavior.zoom()
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	    textControls.update();
	}),
    files = require("./files.js"),
    shortcutKeys = require("./keys.js")(selection, helpLink, zoom, update, model.getNodes),
    fileMenu = require("multiuser-file-menu")(
	"process-models",
	toolbar,
	jsonData.serialize,
	jsonData.deserialize,
	model.get,
	model.set,
	model.freshModel,
	function(toInsert) {
	    model.merge(toInsert);
	    update();
	}),

    modelOperations = require("./data/model-operations.js")(fileMenu.store.writeOp, fileMenu.store.onOp, model.getNodes, model.getLayout, model.onSet, update);

fileMenu.menu.onInsert(update);
model.onSet(update);

zoom.go = function() {
    zoom.event(g);
};

zoom.in = function() {
    zoom.scale(zoom.scale() * 1.1);
    zoom.go();
};
zoom.out = function() {
    zoom.scale(zoom.scale() / 1.1);
    zoom.go();
};

require("./help.js")(helpLink, shortcutKeys.universalKeys());
require("./nodes/draw-process-node.js")(drawNodes, model.getNodes, transitions, update);
zoom(svg);
svg.on("dblclick.zoom", null);

var draw = function() {
    var display = model.getLayout().display();
    
    drawNodes.draw(display.nodes);
    drawEdges.draw(display.edges);
};

var updateExportLink = function(){
    fileMenu.menu.updateExportLink(
	"data:application/json,"
	    + encodeURIComponent(
		JSON.stringify(
		    jsonData.serialize(model.get())
		)
	    )
    );
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
	layout: createLayout(nodes)
    });
};
fromXML.extensions = ["xml"];

files.drop(svg, [fromJson, fromXML]);

var queryString = require("./query-string.js")(fileMenu.menu);
