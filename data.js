"use strict";

/*global ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Data = function(nodes) {
    var serializeEdge = function(edge) {
	return {
	    necessity: edge.necessity(),
	    sufficiency: edge.sufficiency(),
	    to: serializeNode(edge.node())
	};
    };

    var serializeNode = function(node) {
	var serialized = {
	    name: node.name()
	};

	if (node.isLeaf()) {
	    serialized.evidence = node.localEvidence();
	} else {
	    serialized.edges = node.edges().map(serializeEdge);
	    serialized.dependence = node.dependence();
	}

	return serialized;
    };

    var deserializeNode = function(node) {
	var deserialized = nodes.get(node.name);

	if (deserialized) {
	    return deserialized;
	}

	deserialized = nodes.create(node.name);

	if (node.edges && node.edges.length > 0) {
	    node.edges.forEach(function(e){
		var target = deserializeNode(e.to);
		deserialized.edgeTo(target)
		    .necessity(e.necessity)
		    .sufficiency(e.sufficiency);
	    });
	    
	    if (node.dependence) {
		deserialized.dependence(node.dependence);
	    }
	} else {
	    if (node.localEvidence) {
		deserialized.localEvidence(node.evidence);
	    }
	}

	return deserialized;
    };

    var module = {
	serialize: function(rootNode) {
	    return JSON.stringify(serializeNode(rootNode));
	},
	deserialize: function(json) {
	    return deserializeNode(JSON.parse(json));
	}
    };
    return module;
};
