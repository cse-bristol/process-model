"use strict";

/*global module, require*/

var jsonSerialization = require("./json.js"),
    perimetaDeserialize = require("./perimeta-xml.js"),
    exportButtonFactory = require("./export-button.js"),
    fileDrop = require("./file-drop.js");


module.exports = function(body, model) {
    fileDrop(
	{
	    json: function(fileName, content) {
		model.set(
		    jsonSerialization.deserialize(
			JSON.parse(content)
		    )
		);
	    },
	    xml: function(fileName, content) {
		model.setFromNodes(
		    perimetaDeserialize(content)
		);
	    }
	}
    ).drop(body);

    var exportButton;

    return {
	jsonSerialize: jsonSerialization.serialize,
	jsonDeserialize: jsonSerialization.deserialize,

	exportButton: function(fileMenu) {
	    if (fileMenu && !exportButton) {
		exportButton = exportButtonFactory(
		    fileMenu.store.getTitle,
		    fileMenu.store.onNavigate,
		    jsonSerialization.serialize,
		    model.get,
		    fileMenu.spec.button
		);
	    }

	    if (!exportButton) {
		throw new Error("Must create export button by passing in the filemenu to use before we can use the button itself.");
	    }

	    return exportButton;
	}
    };
};
