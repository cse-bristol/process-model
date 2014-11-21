"use strict";

/*global module, require*/

var nodeCollectionFactory = require("./nodes/node-collection.js"),
    layoutFactory = require("./layout.js"),
    helpers = require("./helpers.js"),
    callbacks = helpers.callbackHandler;

/*
 Holds the currently active node-collection and layout. Provides notifications when they change.
 */
module.exports = function() {
    var onSet = callbacks(),
	nodes,
	layout,
	freshModel = function() {
	    var nodes = nodeCollectionFactory();
	    nodes.root(
		nodes.getOrCreateNode("process")
	    );
	    return {
		nodes: nodes,
		layout: layoutFactory(nodes)
	    };
	};
    
    return {
	get: function() {
	    return {
		nodes: nodes,
		layout: layout
	    };
	},

	getNodes: function() {
	    return nodes;
	},

	getLayout: function() {
	    return layout;
	},

	set: function(model) {
	    model.nodes.build();
	    nodes = model.nodes;
	    layout = model.layout;
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
