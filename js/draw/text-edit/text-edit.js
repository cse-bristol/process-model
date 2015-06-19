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

	editorContainer = body.append("div")
	    .classed("text-editor-container", true),

	editor = editorContainer.append("div")
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
    
	panAndZoom = function(translate, scale) {
	    cssPrefix(
	    	editorContainer,
	    	"transform",
		// Pan
		"translate(" + translate[0] + "px," + translate[1] + "px)" +
		    " " +
		    // Zoom
	    	    "scale(" + scale + ")"
	    );
	},

	sizeAndPosition = function(selection, viewModel) {
	    selection
	    	.style("width", viewModel.innerWidth + "px")
		.style("height", viewModel.innerHeight + "px")
	    	.style("left", (viewModel.margin.horizontal + viewModel.x) + "px")
		.style("top", (viewModel.margin.top + viewModel.y) + "px");
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
    
    viewport.zoom.onZoom(panAndZoom);

    return {
	update: function(svgNodes, pastNodeViewModels) {
	    panAndZoom(zoom.translate(), zoom.scale());
	    
	    nodeId = viewport.getCentredNodeId();

	    if (!getNodeCollection().has(nodeId)) {
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

	    editor
		.style("visibility", "visible");

	    if (pastNodeViewModels) {
		pastNodeViewModels = pastNodeViewModels.filter(function(vm) {
		    return vm.id === nodeId;
		});

		if (pastNodeViewModels.length === 1) {
		    sizeAndPosition(editor, pastNodeViewModels[0]);
		}
	    }

	    var viewModel = svgNode.datum();

	    sizeAndPosition(
		transitions.maybeTransition(editor),
		viewModel
	    );


	    if (name.text() !== viewModel.name) {
		name.text(
		    viewModel.name
		);
	    }

	    if (description.html() !== viewModel.description) {
		description.html(
		    viewModel.description
		);
	    }

	    maybeFocus();
	    textControls.update();
	}
    };
};
