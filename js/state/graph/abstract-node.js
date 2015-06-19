"use strict";

/*global module, require*/

var d3 = require("d3"),
    json0 = require("ot-json0").type,
    
    types = require("./process-node.js"),
    helpers = require("../../helpers.js"),
    createEdge = require("./edge.js"),
    callbacks = helpers.callbackHandler;

/*
 Remove special XML characters from the node name.
 */
var cleanse = function(name) {
    if (!name.replace) {
	throw name;
    }
    
    return name
	.replace(/'/g, "")
	.replace(/"/g, "")
	.replace(/&nbsp;/g, " ")
	.replace(/&lt;/g, "lt.")
	.replace(/&gt;/g, "gt.")
	.replace(/&amp;/g, "and")
	.replace(/&/g, "and");
};

var assertNoCycles = function(node) {
    var assertNoCyclesAccum = function(node, seen, edge) {
	if (seen.indexOf(node.id) >= 0) {
	    throw new Error("Cycle detected for node " + node.name() + " from " + edge.parent().name());
	}

	node.edges().forEach(function(e){
	    var copy = seen.slice(0);
	    copy.push(node.id);
	    assertNoCyclesAccum(e.node(), copy, e);
	});
    };
    
    assertNoCyclesAccum(node, []);
},

    modifyOperations = function(offset, toInsert, toDelete) {
	var ops = [];

	if (toDelete) {
	    ops.push({
		p: offset,
		d: toDelete
	    });
	}
	
	if (toInsert) {
	    ops.push({
		p: offset,
		i: toInsert
	    });
	}

	return ops;
    };

/*
 Defines the basic form of a node.

 This is extended on creation using the types defined in process-node.js.

 It's usually better to create a node through a node-collection instead of directly.

 Nodes must always be created with a type and an id. The id should be unique (create it as a guid if you don't know it already).
 */
module.exports = function(type, id, onEdgeCreate, onEdgeDelete, onNavigate) {
    if (!types.has(type)) {
	throw new Error("Unknown type of node " + type);
    }

    if (id === null || id === undefined) {
	throw new Error("Must always specify an id when creating a node.");
    }

    var edges = [],
	description = json0.create(" "),
	name = json0.create("Name");

    var node = {
	/*
	 ids are immutable and never change.
	 They are unique since they are generated with a massive amount of randomness.
	 */
	id: id,
	type: type,
	childTypes: function() {
	    throw new Error("Child types was not implemented for node of type " + type);
	},
	extendIncomingEdge: function(edge) {
	    return edge;
	},
	isLeaf : function() {
	    return edges.length === 0;
	},
	edges: function() {
	    return edges;
	},
	removeEdge : function(edge) {
	    onEdgeDelete(edge);
	    edges.splice(edges.indexOf(edge), 1);
	},
	edgeTo : function(to) {
	    var existingEdge;
	    edges.forEach(function(e){
		if (e.node() === to) {
		    existingEdge = e;
		}
	    });
	    if (existingEdge) {
		return existingEdge;
	    }

	    var edgeTo = createEdge(node, to, onNavigate);
	    edges.push(edgeTo);
	    try {
		assertNoCycles(node);
		onEdgeCreate(edgeTo);
		return edgeTo;
		
	    } catch (err) {
		edges.splice(edges.indexOf(edgeTo), 1);
		throw err;
	    }
	},
	
	name: function() {
	    return name;
	},

	setName: function(newName) {
	    node.modifyName(
		node.modifyNameOperations(0, newName, name)
	    );
	},

	modifyNameOperations: function(offset, insertedText, deletedText) {
	    return modifyOperations(offset, cleanse(insertedText), deletedText);
	},

	modifyName: function(operations) {
	    name = json0.apply(
		name,
		[{
		    p: [],
		    t: 'text0',
		    o: operations
		}]
	    );
	},
	
	description: function() {
	    return description;
	},

	setDescription: function(newDescription) {
	    node.modifyDescription(
		node.modifyDescriptionOperations(0, newDescription, description)
	    );
	},

	modifyDescriptionOperations: modifyOperations,

	modifyDescription: function(operations) {
	    description = json0.apply(
		description,
		[{
		    p: [],
		    t: 'text0',
		    o: operations
		}]
	    );
	},
	
	countDescendents: function() {
	    var seen = [],
		stack = edges.slice(0);

	    while(stack.length > 0) {
		var current = stack.pop().node();
		if (seen.indexOf(current) < 0) {
		    seen.push(current);
		    current.edges().forEach(function(e){
			stack.push(e);
		    });
		}
	    }

	    return seen.length;
	},
	canCollapse: function() {
	    return !node.isLeaf();
	},

	keys: [
	    {
		key: 'del',
		description: 'remove an incoming edge',
		action: function(nodeContainer) {
		    var e = nodeContainer.edgesToNode(node)[0];
		    e.parent().removeEdge(e);
		}
	    },
	    {
		key: "right",
		description: "navigate to first outgoing edge",
		action: function(nodeContainer) {
		    onNavigate(node.edges()[0]);
		}
	    },
	    {
		key: "left",
		description: "navigate to first incoming edge",
		action: function(nodeContainer) {
		    onNavigate(nodeContainer.edgesToNode(node)[0]);
		}
	    },
	    {
		key: "up",
		description: "navigate to the previous node which comes from the same parent",
		action: function(nodeContainer) {
		    onNavigate(
			nodeContainer.edgesToNode(node)[0]
			    .previousEdge()
			    .node()
		    );
		}
	    },
	    {
		key: "down",
		description: "navigate to the next node which comes from the same parent",
		action: function(nodeContainer) {
		    onNavigate(
			nodeContainer.edgesToNode(node)[0]
			    .nextEdge()
			    .node()
		    );
		}
	    }

	]
    };
    
    types.get(type)(node);

    if (!node.allowedChildren.empty()) {
	node.allowedChildren.keys = [{
	    key: 'enter',
	    description: 'create a child node',
	    action: function(nodeContainer) {
		var newNode = nodeContainer.create("undecided");
		node.edgeTo(newNode);
	    }
	}];
    }

    return node;
};
