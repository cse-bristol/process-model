"use strict";

/*global d3, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Nodes = function() {
    var nodes = d3.map({}),
	newNodes = 1;

    var assertNoCycles = function(node) {
	var assertNoCyclesAccum = function(node, seen) {
	    if (seen.indexOf(node.name()) >= 0) {
		throw "Cycle detected";
	    }

	    node.edges().forEach(function(e){
		var copy = seen.slice(0);
		copy.push(node.name());
		assertNoCyclesAccum(e.node(), copy);
	    });
	};
	
	assertNoCyclesAccum(node, []);
    };

    return {
	all : function() {
	    return nodes.values();
	},
	create : function(startName) {
	    var localN = 1,
		localS = 1,
		localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
		edges = [],
		name = startName ? startName : "new " + newNodes++,
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
		    var joinedNodes = edges.map(function(e){
			return e.node();
		    });
		    if (joinedNodes.indexOf(edge.node()) >= 0) {
			return node; // This connection already exists.
		    }

		    edges.push(edge);
		    try {
			assertNoCycles(edge.node());
		    } catch (err) {
			edges.splice(edges.indexOf(edge), 1);
			throw err;
		    }
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
			if (nodes.has(n)) {
			    throw "Name already taken " + n;
			}

			nodes.remove(name);
			name = n;
			nodes.set(n, node);
			
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

	    nodes.set(node.name(), node);
	    return node;
	}
    };
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
	},
	node: function() {
	    return node;
	}
    };
    return edge;
};

