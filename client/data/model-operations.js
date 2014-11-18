"use strict";

/*global module, require*/

var helpers = require("../helpers.js"),
    noop = helpers.noop,
    jsonData = require("./json.js"),
    serialize = jsonData.serialize,
    serializeNode = jsonData.serializeNode,
    serializeEdge = jsonData.serializeEdge;

/*
 Watches the node graph and layout. Makes operations out of changes to them.

 Watched the context and alters the node graph and layout based on the operations it sees.

 TODO subscribe to events.
 TODO examine layout changes.
 */
module.exports = function(getContext, onContextChanged, getNodeCollection, getLayout, onNodeCollectionChanged) {
    var hook = function(o, makePath, serialize, prop) {
	if (o[prop]) {
	    var wrapped = o[prop];
	    o[prop] = function() {
		var args = arguments;

		if (arguments.length) {
		    var oldVal = wrapped.apply(o),
			returnVal = wrapped.apply(o, arguments),
			newVal = wrapped.apply(o);

		    getContext().submitOp(
			[{
			    p: makePath().concat([prop]),
			    od: oldVal,
			    oi: newVal
			}],
			noop
		    );

		    return returnVal;
		} else {
		    return wrapped();
		}
	    };
	}
    };

    var hookNode = function(node) {
	/*
	 I've chosen not to hook up the chooseType function in here. This means that a node changes identity when it changes type, which is probably ok since it has no interesting properties on it.
	 */   
	var makePath = function() {
	    return ["nodes", node.id];
	};

	["name", "localEvidence", "dependence", "settled", "support"]
	    .forEach(function(p) {
		hook(node, makePath, serializeNode, p);
	    });

	// TODO description should use the text interface
    };

    var hookEdge = function(edge) {
	var makePath = function() {
	    return ["nodes", edge.parent().id, "edges", edge.node().id];
	};

	["necessity", "sufficiency"]
	    .forEach(function(p) {
		hook(edge, makePath, serializeEdge, p);
	    });
    };

    onNodeCollectionChanged(function() {
	var coll = getNodeCollection(),
	    layout = getLayout();

	getContext().submitOp(
	    [{
		p: [],
		oi: serialize(coll, layout)
	    }],
	    noop
	);
	
	coll.onNodeCreate(function(node) {
	    hookNode(node);
	    getContext().submitOp(
		[{
		    p: ["nodes", node.id],
		    oi: serializeNode(node)
		}],
		noop
	    );
	});

	coll.onNodeDelete(function(node) {
	    getContext().submitOp(
		[{
		    p: ["nodes", node.id],
		    od: node
		}],
		noop	     
	    );
	});

	coll.onEdgeCreate(function(edge) {
	    getContext().submitOp(
		[{
		    p: ["nodes", edge.parent().id, "edges", edge.node().id],
		    oi: serializeEdge(edge)
		}],
		noop
	    );
	    hookEdge(edge);
	});

	coll.onEdgeDelete(function(edge) {
	    getContext().submitOp(
		[{
		    p: ["nodes", edge.parent().id, "edges", edge.node().id],
		    od: serializeEdge(edge)
		}],
		noop
	    );
	});
    });
};
