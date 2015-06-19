"use strict";

/*global module, require*/

var d3 = require("d3"),
    DOMParser = require('xmldom').DOMParser,
    nodeCollectionFactory = require("../state/graph/node-collection.js"),
    urlRegex = require('url-regex')();

module.exports = function(text) {
    var num = function(elArray) {
	return parseFloat(elArray[0].childNodes[0].data);
    },

	/*
	 Turns our imported XML into some HTML like stuff.
	 */
	webify = function(text) {
	    return text.split("\n").join("<br/>")
		.replace(
		    urlRegex,
		    function(match) {
			return '<a contenteditable="false" target="_top" href="' + match + '">' + match + '</a>';
		    }
		);
	},
	
	loadDependence = function(d) {
	    var single = d.getElementsByTagName("single");

	    if (single.length > 0) {
		return num(single);
	    }

	    throw new Error("Unknown type of dependancy element " + d);
	    return 0;
	},

	loadEvidence = function(e) {
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
	},
	
	loadNodeDetails = function(n, node, nodeCollection) {
	    /* Should be run after joining up all the nodes with edges,
	     because we need to know whether a node is a leaf. */
	    var aspect = n.getElementsByTagName("nodeAspect")[0],
		/* dependancy spelling error occurs in Perimeta XML format */
		dependence = aspect.getElementsByTagName("dependancy"),
		localEvidence = aspect.getElementsByTagName("localFOM"),
		localEvidenceWeight = aspect.getElementsByTagName("localFOMWeight"),
		propagatedEvidenceWeight = aspect.getElementsByTagName("propFOMWeight"),
		metadata = n.getElementsByTagName("optionalAttribute"),
		desc = n.getElementsByTagName("desc"),
		name = n.getAttribute("name").replace(/\//g, "|");

	    node.setName(name);
	    
	    if (dependence.length > 0 && !node.isLeaf() && node.dependence) {
		node.dependence(loadDependence(dependence[0]), true);
	    }

	    if (localEvidence.length > 0 && node.localEvidence) {
		var evidence = loadEvidence(localEvidence[0]);
		
		node.localEvidence(evidence);
	    }

	    /*
	     Mash optional properties into a big text blob.
	     */
	    node.setDescription(
		webify(
		    // add the contents of the <desc> node
		    desc.length > 0 ? Array.prototype.map.call(
			desc[0].childNodes,
			function(n) {
			    return n.data;
			}
		    ).join("\n") : ""
		    
			+ "\n"

		    // Add all the metadata properties
			+ Array.prototype.slice.call(metadata).map(
			    function(m) {
				return m.getAttribute("key") + ": " + m.getAttribute("value");
			    }
			).join("\n")
		)
	    );
	},

	loadLinks = function(links, nodesById) {
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
	},

	doc = new DOMParser().parseFromString(text, "text/xml"),
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
    
    return nodeCollection;
};
