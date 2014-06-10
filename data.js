"use strict";

/*global ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Data = function() {
    var serializeEdge = function(edge) {
	return {
	    necessity: edge.necessity(),
	    sufficiency: edge.sufficiency(),
	    to: serializeNode(edge.node())
	};
    };

    var serializeNode = function(node) {
	return {
	    name: node.name(),
	    description: node.description(),
	    evidence: node.localEvidence(),
	    necessity: node.necessity(),
	    sufficiency: node.sufficiency(),
	    edges: node.edges().map(serializeEdge)
	};
    };

    var deserializeNode = function(node) {
	var deserialized = ProcessModel.Nodes.get(node.name);

	deserialized = ProcessModel.Nodes.create(node.name)
	    .localEvidennce(node.evidence)
	    .necessity(node.necessity)
	    .sufficiency(node.sufficiency);

	node.edges.forEach(function(e){
	    node.addEdge(
		deserializeNode(e.to));
	    node.edgeTo(e.to)
		.necessity(e.necessity)
		.sufficiency(e.sufficiency);
	});

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
}();
