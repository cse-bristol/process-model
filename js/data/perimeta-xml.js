"use strict";

/*global module, require*/

var d3 = require("d3"),
    DOMParser = require('xmldom').DOMParser,
    nodeCollectionFactory = require("../nodes/node-collection.js");

module.exports = function(text) {
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
    
    var loadNodeDetails = function(n, node, nodeCollection) {
	/* Should be run after joining up all the nodes with edges,
	 because we need to know whether a node is a leaf. */
	var aspect = n.getElementsByTagName("nodeAspect")[0],
	    /* dependancy spelling error occurs in Perimeta XML format */
	    dependence = aspect.getElementsByTagName("dependancy"),
	    localEvidence = aspect.getElementsByTagName("localFOM"),
	    localEvidenceWeight = aspect.getElementsByTagName("localFOMWeight"),
	    propagatedEvidenceWeight = aspect.getElementsByTagName("propFOMWeight"),
	    metadata = n.getElementsByTagName("optionalAttribute"),
	    name = n.getAttribute("name").replace(/\//g, "|");

	node.name(name);
	
	if (dependence.length > 0 && !node.isLeaf() && node.dependence) {
	    node.dependence(loadDependence(dependence[0]), true);
	}

	if (localEvidence.length > 0 && node.localEvidence) {
	    var evidence = loadEvidence(localEvidence[0]);
	    
	    if (node.isLeaf()) {
		node.localEvidence(evidence);
	    } else {
		/*
		 We've got some evidence on a non-leaf node, which is not allowed.
		 We'll make an extra leaf node to hold that evidence.
		 */
		
		var evidenceNode = nodeCollection.getOrCreateNode("process");
		evidenceNode.name(node.name() + "/evidence");
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

	/*
	 Mash optional properties into a big text blob.
	 */
	node.description(
	    Array.prototype.slice.call(metadata).map(function(m) {
		return m.getAttribute("key") + ": " + m.getAttribute("value");
	    })
		.join("\n")
	);
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

    var findRootNode = function(nodeCollection) {
	var candidates = nodeCollection.all();

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
    
    var doc = new DOMParser().parseFromString(text, "text/xml"),
	nodeElements = doc.getElementsByTagName("node"),
	links = doc.getElementsByTagName("link"),
	nodeCollection = nodeCollectionFactory();

    /*
     Create all the nodes with just their type and id.
    */
    Array.prototype.forEach.call(nodeElements, function(n){
	nodeCollection.getOrCreateNode(n.parentNode.tagName, n.getAttribute("id"));
    });

    /*
     Join nodes up into a graph.
     */
    loadLinks(links, nodeCollection);

    /*
     Fill in details about each node.
    */
    Array.prototype.forEach.call(nodeElements, function(n){
	loadNodeDetails(n, nodeCollection.get(n.getAttribute("id")), nodeCollection);
    });
    
    nodeCollection.root(findRootNode(nodeCollection));
    return nodeCollection;
};
