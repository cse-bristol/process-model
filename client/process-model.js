"use strict";

/*global parent, require*/

var update = function() {
    if (nodes.all().length === 0) {
	messages.error("No process nodes loaded.");
    } else {
	trackAllowedTypes.update();
	draw();
	updateDownloadLink();
	toolbar.update();
    }

}, withUpdate = function(f) {
    return function(args) {
	f(args);
	update();
    };
};

var d3 = require("d3"),
    URL = require("url"),
    body = d3.select("body"),
    svg = d3.select("svg#model"),
    g = svg.append("g"),
    nodes = require("./nodes/abstract-node.js")(),
    selection = require("./selection.js")(nodes),
    trackAllowedTypes = require("./nodes/allowed-types.js")(nodes),
    transitions = require("./transition-switch.js")(),
    dataConstructor = require("./data.js"),
    perimetaConstructor = require("./perimeta-xml.js"),
    helpLink = d3.select("#help"),
    toolbar = require("./text-toolbar.js")(body, svg, transitions),
    messages = require("./messages.js")(body, update),
    layout = require("./layout.js")(nodes, 240, 70, 10),
    drawNodes = require("./nodes/draw-node.js")(g, transitions, layout, toolbar,
						withUpdate(selection.selected),
						update),
    drawEdges = require("./draw-edge.js")(g, transitions, update),
    zoom = d3.behavior.zoom()
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	    toolbar.update();
	}),
    files = require("./files.js"),
    shortcutKeys = require("./keys.js")(selection, helpLink, zoom, update),

    search = require("./search.js")(body),
    store = require("./store.js")(search, nodes);

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
require("./nodes/draw-process-node.js")(drawNodes, trackAllowedTypes, nodes, transitions, update);
zoom(svg);
svg.on("dblclick.zoom", null);

var draw = function() {
    var display = layout.display();
    
    drawNodes.draw(display.nodes);
    
    drawEdges.draw(display.edges);
};

var updateDownloadLink = function(){
    d3.select("#download")
	.attr("download", function(d, i){
	    return nodes.root().name() + ".json";
	})
	.attr("href", function(d, i){
	    return "data:application/json," + encodeURIComponent(dataConstructor(nodes, layout).serialize(nodes.root()));
	});
};

var fromJson = function(fileName, content){
    nodes.reset();
    nodes.root(dataConstructor(nodes, layout).deserialize(content));
    update();
};
fromJson.extensions = ["json"];

var fromXML = function(fileName, content) {
    nodes.reset();
    perimetaConstructor(nodes).deserialize(content);
    update();
};
fromXML.extensions = ["xml"];

files.drop(svg, [fromJson, fromXML]);

var queryString = require("./query-string.js")(search);
