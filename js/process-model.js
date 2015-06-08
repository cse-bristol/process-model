"use strict";

/*global parent, require*/

var updating = false,
    update = function() {
	if (updating) {
	    return;
	}

	try {
	    updating = true;

	    if (model.empty()) {
		model.set(model.freshModel());
	    }

	    modelOperations.writeBufferedOperations();
	    fileMenu.queryString.toURL();
	    serialization.exportButton.update();

	    draw.update(
		layout()
	    );
	} finally {
	    updating = false;
	}
    };

var d3 = require("d3"),
    URL = require("url"),
    body = d3.select("body"),

    toolbar = body.append("div")
	.attr("id", "toolbar"),
    svg = d3.select("svg#model"),

    helpers = require("./helpers.js"),
    callbacks = helpers.callbackHandler,

    model = require("./model.js")(),
    
    margins = require("./margins.js")(update),
    focus = require("./focus/focus.js")(model.getNodes, svg, zoom, drawNodes.selectNodes, fileMenu.queryString, update, drawNodes.drawNodesHook),
    layout = require("./layout/layout.js")(model.getNodes, model.getLayout, margins),

    draw = require(./draw/draw.js)(body, svg, model.getNodes, model.getLayout, viewportState, update),

    serialization = require("./serialization/serialization.js")(body, model),
    
    fileMenu = require("multiuser-file-menu")(
	"process-models",
	serialization.serialize,
	serialization.deserialize,
	model.get,
	model.set,
	model.freshModel
    ),

    modelOperations = require("./serialization/model-operations.js")(fileMenu.store.writeOp, fileMenu.store.onOp, model.getNodes, model.getLayout, model.set, model.onSet, update),

    insertButton = require("./insert-button.js")(
	fileMenu.store.loadSnapshot,
	model.merge,
	update,
	fileMenu.spec.button),
    
    layoutButton = require("./reset-layout-button.js")(fileMenu.spec.button, model.getLayout, update),
    rotateButton = require("./layout/rotate-button.js")(fileMenu.spec.button, model.getLayout, update),
    zoomToExtentButton = require("./navigation/zoom-to-extent.js")(fileMenu.spec.button, focus),
    expandButton = require("./navigation/mass-expand.js")(fileMenu.spec.button, model.getNodes, model.getLayout, update);

fileMenu.buildMenu(
    toolbar,
    [
	insertButton,
	serialization.exportButton(fileMenu).spec,
	layoutButton,
	rotateButton,
	zoomToExtentButton,
	expandButton
    ].concat(
	margins.makeButtons(fileMenu.spec.toggle)
    ));

model.onSet(function() {
    focus.onSetModel();
    update();
});

fileMenu.queryString.fromURL();
