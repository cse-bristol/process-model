"use strict";

/*global module, require, process*/

var nodes = require("../nodes/abstract-node.js")(),
    perimeta = require("../perimeta-xml.js")(nodes),
    perimetaImport = function(text) {
	nodes.reset();
	perimeta.deserialize(text);
    },
    fs = require("fs"),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8'),
    layout = require("../layout.js")(nodes, 0, 0, 0),
    data = require("../data.js")(nodes, layout),
    dir = "examples/TestModelsforCSE",
    expected = [
	{
	    file: "Achieving Low Carbon Mobility.xml",
	    count: 63,
	    expectedNodes: [
		{
		    name: "Including TQEZ in freight consolidation Scheme",
		    type: "process"
		},
		{
		    name: "Connecting to park and rides",
		    type: "option"
		}
	    ]
	}
    ];

module.exports = {};

fs.readdirSync(dir).forEach(function(file) {
    var perimetaText = decoder.write(fs.readFileSync(dir + "/" + file));

    module.exports["saveThenLoadThenSave_" + file] = function() {
	perimetaImport(perimetaText);

	var serialized = data.serialize(nodes.root());

	data.deserialize(serialized);

	var serializedAgain = data.serialize(nodes.root());

	if (serialized !== serializedAgain) {
	    throw new Error("Serialized twice with different results. First: " + serialized + "\nSecond :" + serializedAgain);
	}
    };
});

expected.forEach(function(test) {
    var perimetaText = decoder.write(fs.readFileSync(dir + "/" + test.file));

    module.exports["loadThenCheck_perimetaText"] = function() {
	perimetaImport(perimetaText);
	if (nodes.all().length !== test.count) {
	    throw new Error("Expected " + test.count + " nodes, but " + nodes.all().length + " were loaded.");
	}

	test.expectedNodes.forEach(function(n) {
	    if (nodes.has(n.name)) {
		var node = nodes.get(n.name);
		if (node.type !== n.type) {
		    throw new Error("Loaded node " + n.name 
				    + " with type " + node.type
				    + " should have been " + n.type);
		}

	    } else {
		console.log(nodes.all().map(function(n){return n.name();}));
		throw new Error("Failed to load node " + n.name);
	    }
	});
    };
});