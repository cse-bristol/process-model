"use strict";

/*global module, require*/

var d3 = require("d3"),
    DOMParser = require('xmldom').DOMParser;

module.exports = function(nodes) {

    var num = function(elArray) {
	return parseFloat(elArray[0].childNodes[0].data);
    };

    var loadDependence = function(d) {
	var single = d.getElementsByTagName("single");

	if (single.length > 0) {
	    return num(single);
	}

	throw new Error("Unknown type of dependancy element " + d);
	return 0;
    };

    var loadEvidence = function(e) {
	var noEvidence = e.getElementsByTagName("noEvidence"),
	    sn = e.getElementsByTagName("sn"),
	    sp = e.getElementsByTagName("sp");

	if (noEvidence.length > 0) {
	    return [0, 1];
	}

	if (sn.length > 0 || sp.length > 0) {
	    return [sn.length === 0 ? 0 : num(sn),
		    sp.length === 0 ? 1 : num(sp)];
	}
	
	throw new Error("Unknown evidence type " + e);
	return [0, 1];
    };
    
    var loadNode = function(n) {
	var name = n.getAttribute("name").replace(/\//g, "|"),
	    node = nodes.create(n.parentNode.tagName, name);

	return node;
    };

    var loadNodeDetails = function(n, node) {
	/* Should be run after joining up all the nodes with edges,
	 because we need to know whether a node is a leaf. */
	var aspect = n.getElementsByTagName("nodeAspect")[0],
	    /* dependancy spelling error occurs in Perimeta XML format */
	    dependence = aspect.getElementsByTagName("dependancy"),
	    localEvidence = aspect.getElementsByTagName("localFOM"),
	    localEvidenceWeight = aspect.getElementsByTagName("localFOMWeight"),
	    propagatedEvidenceWeight = aspect.getElementsByTagName("propFOMWeight"),
	    metadata = n.getElementsByTagName("optionalAttribute");

	if (dependence.length > 0 && !node.isLeaf() && node.dependence) {
	    node.dependence(loadDependence(dependence[0]), true);
	}

	if (localEvidence.length > 0 && node.localEvidence) {
	    var evidence = loadEvidence(localEvidence[0]);
	    
	    if (node.isLeaf()) {
		node.localEvidence(evidence);
	    } else {
		var evidenceNode = nodes.create("process", node.name() + "/evidence");
		evidenceNode.localEvidence(evidence);
		var localEvidenceEdge = node.edgeTo(evidenceNode);
		if (localEvidenceWeight > 0 && propagatedEvidenceWeight > 0) {
		    var localWeight = num(localEvidenceWeight), 
			propWeight = num(propagatedEvidenceWeight), 
			weightRatio = localWeight === 0 ? 0 :
			    propWeight === 0 ? 1 : 
			    localWeight / (localWeight + propWeight);

		    /* There's no clear definition of what 'weight' means in this case. */
		    localEvidenceEdge.necessity(weightRatio);
		    localEvidenceEdge.sufficiency(weightRatio);
		}
	    }
	}

	Array.prototype.slice.call(metadata).forEach(function(m) {
	    node.metadata.push({name: m.getAttribute("key"), children: [
		{name: m.getAttribute("value"), children: []}
	    ]});
	});
    };

    var loadLinks = function(links, nodesById) {
	Array.prototype.forEach.call(links, function(l){
	    var parentId = l.getAttribute("parentNodeId"),
		childId = l.getAttribute("childNodeId"),
		parent = nodesById.get(parentId),
		child = nodesById.get(childId),
		edge = parent.edgeTo(child),
		aspect = l.getElementsByTagName("linkAspect")[0],
		necessity = aspect.getElementsByTagName("necessity"),
		sufficiency = aspect.getElementsByTagName("sufficiency");

	    if (necessity.length > 0 && edge.necessity) {
		edge.necessity(num(necessity));
	    }
	    if (sufficiency.length > 0 && edge.sufficiency) {
		edge.sufficiency(num(sufficiency));
	    }
	});
    };

    var findRootNodes = function(nodesById) {
	var candidates = nodesById.values();

	if (candidates.length === 0 ) {
	    throw new Error("No nodes created");
	} else if (candidates.length === 1) {
	    return candidates[0];
	}

	var nodesWithoutParents = candidates.slice(0);
	candidates.forEach(function(n){
	    var len = n.edges().length;
	    for (var i = 0; i < len; i++) {
		var toRemove = n.edges()[i].node(),
		    indexToRemove = nodesWithoutParents.indexOf(toRemove);
		if (indexToRemove >= 0) {
		    nodesWithoutParents.splice(indexToRemove, 1);
		}
	    }
	});

	if (nodesWithoutParents.length === 0) {
	    throw new Error("Founds nodes, but no possible root node. We must have introduced a cyclic dependency");
	} else if (nodesWithoutParents.length === 1) {
	    return nodesWithoutParents[0];
	}

	nodesWithoutParents.sort(function(a, b){
	    return b.countDescendents() - a.countDescendents();
	});

	return nodesWithoutParents[0];
    };
    
    return {
	deserialize: function(text) {
	    var doc = new DOMParser().parseFromString(text, "text/xml"),
		nodeElements = doc.getElementsByTagName("node"),
		links = doc.getElementsByTagName("link"),
		nodesById = d3.map();

	    Array.prototype.forEach.call(nodeElements, function(n){
		nodesById.set(n.getAttribute("id"), loadNode(n));
	    });

	    loadLinks(links, nodesById);

	    Array.prototype.forEach.call(nodeElements, function(n){
		loadNodeDetails(n, nodesById.get(n.getAttribute("id")));
	    });

	    nodes.root(findRootNodes(nodesById));
	},
	serialize: function(rootnode) {
	    throw new Error("not implemented");
	}
    };
};