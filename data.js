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

	if (node.edges().length > 0) {
	    serialized.edges = node.edges().map(serializeEdge);
	    serialized.dependence = node.dependence();
	} else {
	    serialized.evidence = node.localEvidence();
	}

	return serialized;
    };

    var deserializeNode = function(node) {
	var deserialized = nodes.get(node.name);

	if (deserialized) {
	    return deserialized;
	}

	deserialized = nodes.create(node.name)
	    .necessity(node.necessity)
	    .sufficiency(node.sufficiency);

	if (node.edges) {
	    node.edges.forEach(function(e){
		var target = deserializeNode(e.to);
		deserialized.addEdge(target);
		deserialized.edgeTo(target)
		    .necessity(e.necessity)
		    .sufficiency(e.sufficiency);
	    });
	    
	    deserialized.dependence(node);
	} else {
	    deserialized.localEvidence(node.evidence);
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
