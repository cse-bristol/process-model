"use strict";

/*global parent, require*/

var d3 = require("d3"),
    svg = d3.select("svg#model"),
    g = svg.append("g"),
    nodes = require("./nodes/abstract-node.js")(),
    selection = require("./selection.js")(nodes),
    trackAllowedTypes = require("./nodes/allowed-types.js")(nodes),
    transitions = require("./transition-switch.js")(),
    dataConstructor = require("./data.js"),
    perimetaConstructor = require("./perimeta-xml.js"),
    htmlScrapeConstructor = require("./html-scrape.js");


require("./columns.js")(
    d3.selectAll("#model, #metadata"), 
    [0.7, 0.3]);

require("./help.js")(d3.select("#help"));

var update = function() {
    trackAllowedTypes.update();
    draw();
    updateDownloadLink();
}, withUpdate = function(f) {
    return function(args) {
	f(args);
	update();
    };
};

var drawMetadata = require("./draw-metadata.js")(
    d3.select("#metadata"), 
    selection.select, 
    update),

    layout = require("./layout.js")(nodes, 240, 70, 10),

    drawNodes = require("./nodes/draw-node.js")(g, transitions, layout,
						withUpdate(selection.selected),
						update),

    drawEdges = require("./draw-edge.js")(g, transitions, update),

    zoom = d3.behavior.zoom()
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

require("./nodes/draw-process-node.js")(drawNodes, trackAllowedTypes, nodes, transitions, update);
zoom(svg);

var draw = function() {
    var display = layout.display();
    
    drawNodes.draw(display.nodes);
 
    drawEdges.draw(display.edges);

    drawMetadata.draw(selection.selected());
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

require("./files.js").drop(svg, [fromJson, fromXML]);

if (parent !== window) {
    /* If we're in an iframe, assume our parent is what we want to scrape. */
    htmlScrapeConstructor(nodes).scrape(document.referrer, update);
} 
if (nodes.root() === null) {
    htmlScrapeConstructor(nodes).scrapeCurrent(update);
}
if (nodes.root() === null) {
    htmlScrapeConstructor.Scrape(nodes).scrape("table-test.html", update);
}
