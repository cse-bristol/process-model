"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Data = function(nodes, layout) {
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

	nodes.root(deserialized);
	return deserialized;
    };

    var serializeLayout = function() {
	return {
	    collapsed: layout.collapsed().values(),
	    positions: layout.position().entries()
	};
    };
    
    var deserializeLayoutAndData = function(o) {
	o.layout.collapsed.forEach(function(c){
	    layout.collapsed(c);
	});
	o.layout.positions.forEach(function(e){
	    layout.position(e.key, e.value);
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
