"use strict";

/*global parent, require*/

var update = function() {
    if (!nodeCollection) {
	setNodeCollectionAndLayout(
	    freshNodeCollectionAndLayout()
	);
    }
    
    draw();
    updateDownloadLink();
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
    createNodeCollection = require("./nodes/node-collection.js"),
    createLayout = require("./layout.js"),
    nodeCollection,
    layout,
    getNodeCollection = function() {
	return nodeCollection;
    },
    getLayout = function() {
	return layout;
    },
    setNodeCollectionAndLayout = function(val) {
	val.nodes.build();
	nodeCollection = val.nodes;
	layout = val.layout;
	
	onNodeCollectionChanged();
	update();
    },
    freshNodeCollectionAndLayout = function() {
	var nodes = createNodeCollection();
	nodes.root(
	    nodes.getOrCreateNode("process")
	);
	return {
	    nodes: nodes,
	    layout: createLayout(nodes)
	};
    },
    onNodeCollectionChanged = callbacks(),
    selection = require("./selection.js")(onNodeCollectionChanged.add, getNodeCollection),
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
    shortcutKeys = require("./keys.js")(selection, helpLink, zoom, update, getNodeCollection),
    backend = require("./data/backend.js")(),
    documentControl = require("./document-controls.js")(toolbar, backend.search),
    store = require("./data/store.js")(backend, documentControl, getNodeCollection, getLayout, setNodeCollectionAndLayout, freshNodeCollectionAndLayout),
    modelOperations = require("./data/model-operations.js")(store.context, store.onContextChanged.add, getNodeCollection, getLayout, onNodeCollectionChanged.add);

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
require("./nodes/draw-process-node.js")(drawNodes, getNodeCollection, transitions, update);
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
	    return document.title + ".json";
	})
	.attr("href", function(d, i){
	    return "data:application/json," + encodeURIComponent(
		JSON.stringify(
		    jsonData.serialize(nodeCollection, layout)));
	});
};

var fromJson = function(fileName, content){
    setNodeCollectionAndLayout(
	jsonData.deserialize(
	    JSON.parse(content)));
};
fromJson.extensions = ["json"];

var fromXML = function(fileName, content) {
    setNodeCollectionAndLayout({
	nodes: perimetaDeserialize(content),
	layout: createLayout(getNodeCollection)
    });
};
fromXML.extensions = ["xml"];

files.drop(svg, [fromJson, fromXML]);

var queryString = require("./query-string.js")(documentControl);
