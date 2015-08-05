"use strict";

/*global module, require*/

var nodeCollectionFactory = require("./graph/node-collection.js"),
    layoutStateFactory = require("./layout-state.js"),
    helpers = require("../helpers.js"),
    callbacks = helpers.callbackHandler;

/*
 Holds the currently active node-collection and layout. Provides notifications when they change.
 */
module.exports = function() {
    var onSet = callbacks(),
	onViewpointSaved = callbacks(),
	nodes,
	layout,
	savedViewpoint,
	freshModel = function() {
	    var nodes = nodeCollectionFactory();
	    nodes.getOrCreateNode("process");
	    
	    return {
		nodes: nodes,
		layout: layoutStateFactory(nodes),
		viewpoint: null
	    };
	};
    
    return {
	get: function() {
	    return {
		nodes: nodes,
		layout: layout,
		savedViewpoint: savedViewpoint
	    };
	},

	getNodes: function() {
	    return nodes;
	},

	getLayout: function() {
	    return layout;
	},

	getSavedViewpoint: function() {
	    return (savedViewpoint && savedViewpoint.copy()) || null;
	},

	setSavedViewpoint: function(viewpointState) {
	    savedViewpoint = (viewpointState && viewpointState.copy()) || null;
	    onViewpointSaved(savedViewpoint);
	},

	onViewpointSaved: onViewpointSaved.add,

	set: function(model) {
	    nodes = model.nodes;
	    layout = model.layout;
	    savedViewpoint = model.savedViewpoint;
	    onSet();
	},

	setFromNodes: function(nodesCollection) {
	    nodes = nodesCollection;
	    layout = layoutStateFactory(nodes);
	    savedViewpoint = null;
	    onSet();
	},

	onSet: onSet.add,

	freshModel: freshModel,

	empty: function() {
	    return !nodes;
	},

	merge: function(model) {
	    model.nodes.all().forEach(function(n) {
		if (nodes.has(n.id)) {
		    throw new Error("Node in inserted document already exists " + n.name);
		}
	    });

	    nodes.merge(model.nodes);
	    layout.merge(model.layout);
	}
    };
};
