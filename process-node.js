"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var OpenDataMap = {};
}

ProcessModel.Node = function() {
    var localW = 0.5;
    var localE = [0, 1];
    var edges = [];

    var combine = function(p, weight, evidence) {
	throw "Not implemented";
    };

    return {
	localEvidence: function(evidence) {
	    if (evidence) {
		localE = evidence;
	    }
	    return localE;
	},
	localWeight: function(weight) {
	    if (weight) {
		localW = weight;
	    }
	    return localW;
	},
	edges: function() {
	    return edges;
	},
	addEdge: function(edge) {
	    edges.push(edge);
	},
	p: function() {
	    var evidence = [0.0, 1.0];

	    evidence = combine(evidence, localW, localE);

	    edges.forEach(function(edge){
		evidence = combine(evidence, edge.weight(), edge.node().p();
	    });
	    	    
	    return evidence;
	}

    };
};
