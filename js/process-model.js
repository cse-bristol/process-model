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
	    serialization.exportButton().update();

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

    model = require("./state/model.js")(),

    serialization = require("./serialization/serialization.js")(body, model),
    
    fileMenu = require("multiuser-file-menu")(
	"process-models",
	serialization.jsonSerialize,
	serialization.jsonDeserialize,
	model.get,
	model.set,
	model.freshModel
    ),    
    
    margins = require("./margins.js")(update),
    // ToDo put in textEditor here
    draw = require("./draw/draw.js")(body, svg, fileMenu.queryString, null, model.getNodes, model.getLayout, update),    
    layout = require("./layout/layout.js")(model.getNodes, model.getLayout, draw.viewport, margins),

    modelOperations = require("./serialization/model-operations.js")(fileMenu.store.writeOp, fileMenu.store.onOp, model.getNodes, model.getLayout, model.set, model.onSet, update),

    insertButton = require("./insert-button.js")(
	fileMenu.store.loadSnapshot,
	model.merge,
	update,
	fileMenu.spec.button),
    
    layoutButton = require("./layout/reset-layout-button.js")(fileMenu.spec.button, model.getLayout, update),
    rotateButton = require("./layout/rotate-button.js")(fileMenu.spec.button, model.getLayout, update),
    expandButton = require("./mass-expand-button.js")(fileMenu.spec.button, model.getNodes, model.getLayout, update);

fileMenu.buildMenu(
    toolbar,
    [
	insertButton,
	serialization.exportButton(fileMenu).spec,
	layoutButton,
	rotateButton,
	draw.viewport.makeFitButton(fileMenu.spec.button),
	expandButton
    ].concat(
	margins.makeButtons(fileMenu.spec.toggle)
    ));

model.onSet(function() {
    draw.viewport.onSetModel();
    update();
});

fileMenu.queryString.fromURL();
