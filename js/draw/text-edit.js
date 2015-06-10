"use strict";

/*global module, require, setTimeout*/

var _ = require("lodash"),
    textControlsFactory = require("zenpen-toolbar"),
    cssPrefix = require("./css-browser-prefixes.js");

/*
 Floating edit elements for one node.

 The contents, position and size will be altered to fit the node currently being edited. 
 */
module.exports = function(body, getNodeCollection, viewport, update) {
    var state = null,
	zoom = viewport.zoom,
	width = width,
	height = height,
	x,
	y,

	saveData = _.debounce(
	    function(currentState, currentName, currentDescription) {
		// if (currentState.id) {
		//     var node = getNodeCollection().get(
		// 	currentState.id
		//     );

		//     if (node) {
		// 	if (currentName !== currentState.name) {
		// 	    currentState.name = currentName;
		// 	    node.name(currentName);
		// 	}

		// 	if (currentDescription !== currentState.description) {
		// 	    currentState.description = currentDescription;
		// 	    node.description(currentDescription);
		// 	}
		//     }
		// }
	    },
	    500
	),

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
	    // ToDo sort out saving state	    
	    viewport.uncentreNode();
	    update();
	},

	editor = body.append("div")
	    .classed("text-editor", true),

	name = editor.append("div")
	    .classed("edit-name", true)
	    .attr("contenteditable", true)
	    .on("input", saveData),

	description = editor.append("div")
	    .classed("edit-description", true)
	    .attr("contenteditable", true)    
	    .on("input", saveData),

	textControls = textControlsFactory(body),

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

    textControls(description);
    viewport.zoom.onZoom(positionEditor);

    return {
	update: function(svgNodes) {
	    var id = viewport.getCentredNodeId(),
		node = getNodeCollection().get(id);

	    if (!node) {
		editor.style("visibility", "hidden");
		textControls.update();
		return;
	    }
	    
	    var	svgNode = svgNodes.filter(function(d, i) {
		    return d.id === id;
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
	    y = nodeViewModel.margin.vertical + nodeViewModel.y;

	    positionEditor(zoom.translate(), zoom.scale());

	    editor
		.style("visibility", "visible")
		.style("width", width + "px")
		.style("height", height + "px");

	    // ToDo this will cause annoying cursor behaviour and probably oscillating text when we have 2 users editing a node at once.
	    name.text(
		nodeViewModel.name
	    );
	    description.text(
		nodeViewModel.description
	    );

	    maybeFocus();
	    textControls.update();
	}
    };
};
