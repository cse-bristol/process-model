"use strict";

/*global module, require*/

var nodes = require("../nodes/abstract-node.js")(),
    deserialize = require("../perimeta-xml.js")(nodes).deserialize,
    fs = require("fs"),
    StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8');

var testPerimetaXML = function(fileName, sn, sp) {
    return function() {
	nodes.reset();
	
	deserialize(decoder.write(fs.readFileSync(fileName)));

	var p = nodes.root().p();

	if (p !== [sn, sp]) {
	    throw new Error("Expected " + [sn, sp] + " got " + p);
	}
    };
};

module.exports = {
    beliefPropagation1: testPerimetaXML("test/belief-propagation1.xml", 0.25, 0.25),
    beliefPropagation2: testPerimetaXML("test/belief-propagation2.xml", 0.875, 1.0),
    beliefPropagation3: testPerimetaXML("test/belief-propagation3.xml", 0.37, 0.42)
};
