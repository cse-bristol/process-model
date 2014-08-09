"use strict";

/*global require, module*/

var d3 = require("d3"),
    combineEvidence = require("../combine-evidence.js"),
    clamp = require("../helpers.js").clamp;

module.exports = d3.map({
    "undecided" : function(node) {
	node.allowedChildren = d3.set();
    },

    "process" : function(node){
	var localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
	    localDep = 1;

	node.allowedChildren = d3.set(["process", "issue", "option"]);

	node.localEvidence = function(evidence) {
	    if (evidence) {
		if (node.edges().length > 0) {
		    throw new Error("Cannot set local evidence on a node which has children");
		}

		if (evidence[0] < 0) {
		    evidence[0] = 0;
		} else if (evidence[0] > 1) {
		    evidence[0] = 1;
		}
		if (evidence[1] < 0) {
		    evidence[1] = 0;
		} else if (evidence[1] > 1) {
		    evidence[1] = 1;
		}
		if (evidence[0] > evidence[1]) {
		    var mid = (evidence[0] + evidence[1]) / 2;
		    evidence[0] = mid;
		    evidence[1] = mid;
		}

		localE = evidence;
		return node;
	    }
	    return localE;
	};

	node.dependence = function(dependence) {
	    if (node.edges().length === 0) {
		throw "Dependence is not used for leaf nodes.";
	    }
	    
	    if (dependence) {
		localDep = clamp(0, dependence, 1);
	    }
	    
	    return localDep;
	};

	node.p = function() {
	    if (node.edges().length === 0) {
		return localE;
	    } else {
		return combineEvidence(localDep, node.edges()
						    .filter(function(e) {
							return e.node().type === "process";
						    })
						    .map(function(e){
							return {
							    necessity: e.necessity(),
							    sufficiency: e.sufficiency(),
							    evidence: e.node().p()
							};
						    }));
	    }
	};

	node.extendIncomingEdge = function(edge) {
	    var necessity = 0.5,
		sufficiency = 0.5;
	    
	    edge.necessity = function(n) {
		if (n) {
		    necessity = clamp(0, n, 1);
		    return edge;
		}
		return necessity;
	    };
	    edge.sufficiency = function(s) {
		if (s) {
		    sufficiency = clamp(0, s, 1);
		    return edge;
		}
		return sufficiency;
	    };
	    return edge;
	};
    },

    "issue" : function(node){
	var settled = false;

	node.allowedChildren = d3.set(["option"]);
	node.settled = function(val) {
	    if (val === undefined) {
		return settled;
	    } else {
		settled = val;
		return node;
	    }
	};
    },

    "option" : function(node){
	node.allowedChildren = d3.set(["argument", "option"]);
    },

    "argument" : function(node){
	var support = false;

	node.allowedChildren = d3.set();
	node.support = function(val) {
	    if (val === undefined) {
		return support;
	    } else {
		support = val;
		return node;
	    }
	};
    }
});



