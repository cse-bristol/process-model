"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Node = function() {
    var localN = 1,
	localS = 1,
	localE = [0, 1],
	edges = [],
	name = "",
	description = "";

    var combine = function(p, necessity, sufficiency, evidence) {
	/* TODO */
	return evidence;
    };

    var node = {
	localEvidence: function(evidence) {
	    if (evidence) {
		localE = evidence;
		return node;
	    }
	    return localE;
	},
	localNecessity: function(necessity) {
	    if (necessity) {
		localN = necessity;
		return node;
	    }
	    return localN;
	},
	localSufficiency: function(sufficiency) {
	    if (sufficiency) {
		localS = sufficiency;
		return node;
	    }
	    return localS;
	},
	edges: function() {
	    return edges;
	},
	addEdge: function(edge) {
	    edges.push(edge);
	    return node;
	},
	p: function() {
	    /* Our prior is total uncertainty. */
	    var evidence = [0.0, 1.0];

	    /* Necessity and sufficiency must add up to 1. To enforce this, we first calculate the normalisation factor. */
	    var nNorm = localN;
	    var sNorm = localS;
	    edges.forEach(function(edge){
		nNorm += edge.necessity();
		sNorm += edge.sufficiency();
	    });

	    /* We add the local evidence. */
	    evidence = combine(evidence, localN/nNorm, localS/sNorm, localE);

	    /* Then the evidence for each node it depends on. */
	    edges.forEach(function(edge){
		evidence = combine(evidence, edge.necessity()/nNorm, edge.sufficiency()/sNorm, edge.node().p());
	    });
	    	    
	    return evidence;
	},
	name: function(n) {
	    if (n) {
		name = n;
		return node;
	    }
	    return name;
	},
	description: function(d) {
	    if (d) {
		description = d;
		return node;
	    }
	    return description;
	}
    };
    return node;
};

ProcessModel.Edge = function(node) {
    var necessity = 1,
	sufficiency = 1;

    var edge = {
	necessity : function(n) {
	    if (n) {
		necessity = n;
		return edge;
	    }
	    return necessity;
	},
	sufficiency : function(s) {
	    if (s) {
		sufficiency = s;
		return edge;
	    }
	    return sufficiency;
	}
    };
    return edge;
};

