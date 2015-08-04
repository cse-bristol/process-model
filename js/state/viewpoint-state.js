"use strict";

/*global module, require*/

var modes = {
    fit: "fit",
    centred: "centred",
    subtree: "subtree",
    manual: "manual"
},

    createCentred = function(initialNodeId) {
	var nodeId = initialNodeId;

	return {
	    mode: modes.centred,
	    copy: function() {
		return createCentred(nodeId);
	    },
	    getNodeId: function() {
		return nodeId;
	    },
	    setNodeId: function(newNodeId) {
		nodeId = newNodeId;
	    },
	    serialize: function() {
		return {
		    mode: modes.centred,
		    nodeId: nodeId
		};
	    }
	};
    },

    createSubtree = function(initialNodeId) {
	var nodeId = initialNodeId;

	return {
	    mode: modes.subtree,
	    copy: function() {
		return createSubtree(nodeId);
	    },
	    getNodeId: function() {
		return nodeId;
	    },
	    setNodeId: function(newNodeId) {
		nodeId = newNodeId;
	    },
	    serialize: function() {
		return {
		    mode: modes.subtree,
		    nodeId: nodeId
		};
	    }
	};
    },

    createFit = function() {
	return {
	    mode: modes.fit,
	    copy: function() {
		return createFit();
	    },
	    serialize: function() {
		return {
		    mode: modes.fit
		};
	    }
	};
    },

    createManual = function(initialScale, initialTranslate) {
	var scale = initialScale,
	    translate = initialTranslate;

	return {
	    mode: modes.manual,
	    copy: function() {
		return createManual(scale, translate);
	    },
	    getScale: function() {
		return scale;
	    },
	    setScale: function(newScale) {
		scale = newScale;
	    },
	    getTranslate: function() {
		return translate;
	    },
	    setTranslate: function(newTranslate) {
		translate = newTranslate;
	    },
	    serialize: function() {
		return {
		    mode: modes.manual,
		    scale: scale,
		    translate: translate
		};
	    }
	};
    };

module.exports = {
    modes: modes,

    create: function(mode, options) {
	var result,
	    o = options || {};
	
	switch(mode) {
	case modes.centred:
	    result = createCentred(o.nodeId);
	    break;
	case modes.subtree:
	    result = createSubtree(o.nodeId);
	    break;
	case modes.fit:
	    result = createFit();
	    break;
	case modes.manual:
	    result = createManual(o.scale, o.translate);
	    break;
	default:
	    throw new Error("Unknown viewpoint mode", mode);
	}

	return result;
    },

    deserialize: function(serialized) {
	return (serialized && module.exports.create(serialized.mode, serialized)) || null;
    }
};
