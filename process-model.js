"use strict";

/*global parent, d3, ProcessModel */

var svg = d3.select("svg#model");

var g = svg.append("g");

var nodes = ProcessModel.Nodes();
var trackAllowedTypes = ProcessModel.TrackAllowedTypes(nodes);
var transitions = ProcessModel.Transition();

var update = function() {
    trackAllowedTypes.update();
    draw();
    updateDownloadLink();
};


var drawNodes = ProcessModel.DrawNodes(g, transitions, 50, 150, update);

ProcessModel.DrawNodeTypes(drawNodes,
			   trackAllowedTypes,
			   nodes,
			   update);

var drawEdges = ProcessModel.DrawEdges(g, transitions, update);

var zoom = d3.behavior.zoom()
	.on("zoom", function(){
	    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	});

zoom(svg);

var layout = ProcessModel.Layout(nodes, drawNodes.nodeWidth, drawNodes.nodeHeight);

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
	    return "data:application/json," + encodeURIComponent(ProcessModel.Data(nodes, layout).serialize(nodes.root()));
	});
};

var fromJson = function(fileName, content){
    nodes.reset();
    nodes.root(ProcessModel.Data(nodes, layout).deserialize(content));
    update();
};

var fromXML = function(fileName, content) {
    nodes.reset();
    ProcessModel.PerimetaXML(nodes).deserialize(content);
    update();
};

ProcessModel.Files.drop(svg, [fromJson, fromXML]);

if (parent !== window) {
    /* If we're in an iframe, assume our parent is what we want to scrape. */
    ProcessModel.Scrape(nodes).scrape(document.referrer, update);
} 
if (nodes.root() === null) {
    ProcessModel.Scrape(nodes).scrapeCurrent(update);
}
if (nodes.root() === null) {
    ProcessModel.Scrape(nodes).scrape("table-test.html", update);
}
