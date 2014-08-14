"use strict";

/*global require, module*/

var d3 = require("d3");

module.exports = function(nodes, layout) {
    var serializeEdge = function(edge) {
	var serialized = {
	    to: serializeNode(edge.node())
	};
	
	if (edge.necessity) {
	    serialized.necessity = edge.necessity();
	}

	if (edge.sufficiency) {
	    serialized.sufficiency = edge.sufficiency();
	}

	return serialized;
    };

    var serializeNode = function(node) {
	var serialized = {
	    name: node.name(),
	    type: node.type,
	    metadata: node.metadata,
	    description: node.description(),
	    url: node.url()
	};

	if (node.isLeaf()) {
	    if (node.localEvidence) {
		serialized.evidence = node.localEvidence();		
	    }
	} else {
	    serialized.edges = node.edges().map(serializeEdge);
	    if (node.dependence) {
		serialized.dependence = node.dependence();
	    }
	}

	if (node.settled) {
	    serialized.settled = node.settled();
	}

	if (node.support) {
	    serialized.support = node.support();
	}

	return serialized;
    };

    var deserializeNode = function(node) {
	var deserialized = nodes.get(node.name);

	if (deserialized) {
	    return deserialized;
	}

	deserialized = nodes.create(node.type, node.name);

	if (node.edges && node.edges.length > 0) {
	    node.edges.forEach(function(e){
		var target = deserializeNode(e.to);
		var edge = deserialized.edgeTo(target);

		if (edge.necessity) {
		    edge.necessity(e.necessity);
		}
		if (edge.sufficiency) {
		    edge.sufficiency(e.sufficiency);
		}
	    });
	    
	    if (node.dependence) {
		deserialized.dependence(node.dependence);
	    }
	} else {
	    if (node.localEvidence) {
		deserialized.localEvidence(node.evidence);
	    }
	}

	if (node.metadata) {
	    deserialized.metadata = node.metadata;
	}

	if (node.description) {
	    deserialized.description(node.description);
	}

	if (node.url) {
	    deserialized.url(node.url);
	}

	if (deserialized.settled) {
	    deserialized.settled(node.settled);
	}

	if (deserialized.support) {
	    deserialized.support(node.support);
	}

	return deserialized;
    };

    var serializeLayout = function() {
	return {
	    collapsed: layout.collapsed().values(),
	    positions: layout.position().entries(),
	    sizes: layout.size().entries()
	};
    };
    
    var deserializeLayoutAndData = function(o) {
	o.layout.collapsed.forEach(function(c){
	    layout.collapsed(c);
	});
	o.layout.positions.forEach(function(e){
	    layout.position(e.key, e.value);
	});
	o.layout.sizes.forEach(function(e) {
	    layout.size(e.key, e.value);
	});

	return deserializeNode(o.root);
    };

    var module = {
	serialize: function(rootNode) {
	    return JSON.stringify(
		{
		    layout: serializeLayout(),
		    root: serializeNode(rootNode)
		});
	},
	deserialize: function(json) {
	    return deserializeLayoutAndData(JSON.parse(json));
	}
    };
    return module;
};
