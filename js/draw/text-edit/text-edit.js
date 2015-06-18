"use strict";

/*global module, require, setTimeout*/

var d3 = require("d3"),
    textControlsFactory = require("zenpen-toolbar"),
    cssPrefix = require("../css-browser-prefixes.js"),
    simplifiedHTML = require("./dom-to-simplified-html.js")(),
    diffOperations = require("./diff-operations.js"),

    enterKey = 13;

/*
 Floating edit elements for one node.

 The contents, position and size will be altered to fit the node currently being edited. 
 */
module.exports = function(body, getNodeCollection, viewport, transitions, update) {
    var zoom = viewport.zoom,
	nodeId = null,
	width = width,
	height = height,
	x,
	y,

	maybeFocus = function() {
	    if (document.activeElement === name.node() ||
		document.activeElement === description.node() ||
		document.activeElement === editor.node()
	       ) {
		   return;
	       } else {
		   name.node().focus();
	       }
	},

	disableEditor = function() {
	    viewport.uncentreNode();
	    update();
	},

	editor = body.append("div")
	    .classed("text-editor", true),

	saveName = function() {
	    var node = getNodeCollection().get(nodeId);

	    if (node) {
		node.modifyName(
		    diffOperations(
			node.name(),
			name.text()
		    )
		);
	    }
	},

	name = editor.append("div")
	    .classed("edit-name", true)
	    .attr("contenteditable", true)
	    .on("keypress", function() {
		if (d3.event.which === enterKey) {
		    /*
		     Prevent newlines.
		     The user can still paste newlines, but these will get removed on save.
		     */
		    d3.event.stopPropagation();
		    d3.event.preventDefault();
		}
	    })
    // "input" is the correct event here - others included for Internet Explorer compatibility.
	    .on("keyup", saveName)
    	    .on("paste", saveName)
	    .on("blur", saveName)
	    .on("input", saveName),

	textControls = textControlsFactory(body),
	
	description = editor.append("div")
	    .classed("edit-description", true)
	    .attr("contenteditable", true),
    
	positionEditor = function(translate, scale) {
	    /*
	     Our editor gets the wrong position equal to half its size multiplied by (scale - 1).

	     Adding half its size in the first translate doesn't appear to correct this.

	     I believe the problem may be due to the origin of transformation being in a slightly different place for svg and css transforms, but was not able to resolve it nicely.
	     */
	    var enlargement = scale - 1,
		hackedSize = [
		    translate[0] + (enlargement * width / 2),
		    translate[1] + (enlargement * height / 2)
		];
	    
	    cssPrefix(
	    	editor,
	    	"transform",
		// Pan
		"translate(" + hackedSize[0] + "px," + hackedSize[1] + "px)" +
		    " " +
		    // Zoom
	    	    "scale(" + scale + ")" +
	    	    " " +
		    // Offset for node position + margins
	    	    "translate(" + x + "px," + y + "px)"
	    );
	};

    textControls(
	description,
	function() {
	    var node = getNodeCollection().get(nodeId);
	    node.modifyDescription(
		diffOperations(
		    node.description(),
		    simplifiedHTML(description.node())
		)
	    );
	}
    );
    
    viewport.zoom.onZoom(positionEditor);

    return {
	update: function(svgNodes) {
	    var changedNode = nodeId === viewport.getCentredNodeId();
	    
	    nodeId = viewport.getCentredNodeId();

	    var node = getNodeCollection().get(nodeId);

	    if (!node) {
		editor.style("visibility", "hidden");
		textControls.update();
		return;
	    }
	    
	    var	svgNode = svgNodes.filter(function(d, i) {
		return d.id === nodeId;
	    });

	    if (svgNode.size() !== 1) {
		/*
		 We didn't get asked to redraw the important node.
		 */
		return;
	    }

	    var nodeViewModel = svgNode.datum();

	    width = nodeViewModel.innerWidth,
	    height = nodeViewModel.innerHeight;
	    x = nodeViewModel.margin.horizontal + nodeViewModel.x;
	    y = nodeViewModel.margin.top + nodeViewModel.y;

	    positionEditor(zoom.translate(), zoom.scale());

	    editor
		.style("visibility", "visible");

	    transitions.maybeTransition(editor)
		.style("width", width + "px")
		.style("height", height + "px");

	    if (name.text() !== nodeViewModel.name) {
		name.text(
		    nodeViewModel.name
		);
	    }

	    if (description.html() !== nodeViewModel.description) {
		description.html(
		    nodeViewModel.description
		);
	    }

	    maybeFocus();
	    textControls.update();
	}
    };
};
