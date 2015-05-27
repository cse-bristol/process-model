"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(getNodeCollection) {
    var findChildIdsAccum = function(id, accum, nodes) {
	if (!nodes.has(id)) {
	    return;
	}
	
	var current = nodes.get(id);

	accum.set(id, current);
	
	current.edges().forEach(function(e) {
	    if (!accum.has(e.node().id)) {
		findChildIdsAccum(
		    e.node().id,
		    accum,
		    nodes
		);
	    }
	});
    };

    return function(id) {
	if (!id) {
	    return d3.set();
	}
	
	var accum = d3.map();

	findChildIdsAccum(id, accum, getNodeCollection());
	
	return d3.set(accum.keys());
    };
};
