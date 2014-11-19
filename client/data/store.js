"use strict";

/*global module, require*/

var _ = require("lodash"),
    collectionFactory = require("../nodes/node-collection.js"),
    layoutFactory = require("../layout.js"),
    helpers = require("../helpers"),
    noop = helpers.noop,
    callbacks = helpers.callbackHandler,
    jsonData = require("./json.js");

/*
 Translates things the user does with the document control into actions on the backend.

 Keeps track of the open sharejs document.
 */
module.exports = function(backend, documentControl, getNodeCollection, getLayout, setNodeCollectionAndLayout, freshNodeCollectionAndLayout, update) {
    var doc,
	context,
	// Manual mechanism to track when we're making changes, so that we don't write out own events.
	writing = false,
	onContextChanged = callbacks(),
	onOp = callbacks(),
	setDoc = function(newDoc) {
	    if (doc) {
		doc.destroy();
		context = null;
	    }
	    doc = newDoc;
	    doc.on("after op", function(ops, context) {
		if (!writing) {
		    ops.forEach(function(op) {
			onOp(op);
		    });
		}
	    });
	    
	},
	/*
	 Document must have been deleted for this to work.
	 */
	saveDoc = function(nodeCollection, layout) {
	    writing = true;
	    
	    doc.create("json0", jsonData.serialize(nodeCollection, layout));
	    context = doc.createContext();
	    onContextChanged();
	    
	    writing = false;
	};
    
    documentControl.onOpen(function(name) {
	backend.load(
	    name,
	    function(loaded) {
		setDoc(loaded);
		var snapshot = doc.getSnapshot();
		
		if (snapshot) {
		    setNodeCollectionAndLayout(
			jsonData.deserialize(snapshot)
		    );
		    context = doc.createContext();
		    
		} else {
		    var content = freshNodeCollectionAndLayout();
		    saveDoc(content.nodes, content.layout);
		    setNodeCollectionAndLayout(content);
		}
	    }
	);
    });

    documentControl.onInsert(function(name) {
	backend.load(
	    name,
	    function(loaded) {
		try {
		    var snapshot = loaded.getSnapshot();
		    if (snapshot) {
			var deserialized = jsonData.deserialize(snapshot),
			    coll = getNodeCollection();

			deserialized.nodes.all().forEach(function(n) {
			    if (coll.has(n.id)) {
				throw new Error("Attempted to import a document which had some of the same nodes as this document.");
			    }
			});

			coll.merge(deserialized.nodes);
			getLayout().merge(deserialized.layout);
			update();
		    } else {
			throw new Error("Attempted to import a collection, but it has been deleted " + name);
		    }
		} finally {
		    loaded.destroy();
		}
	    }
	);
    });

    documentControl.onDelete(backend.deleteDoc);

    documentControl.onSaveAs(function(name) {
	backend.load(
	    name,
	    function(loaded) {
		setDoc(loaded);
		var snapshot = loaded.getSnapshot();
		if (snapshot) {
		    doc.del();
		}

		saveDoc(getNodeCollection(), getLayout());
	    });
    });

    documentControl.onNew(function(name) {
	backend.load(
	    name,
	    function(loaded) {
		setDoc(loaded);
		var snapshot = loaded.getSnapshot();
		if (snapshot) {
		    doc.del();
		}

		var content = freshNodeCollectionAndLayout();
		saveDoc(content.nodes, content.layout);
		setNodeCollectionAndLayout(content);
	    });
    });

    return {
	writeOp: function(op) {
	    writing = true;
	    try {
		context.submitOp([op], noop);
	    } finally {
		writing = false;
	    }
	},

	onContextChanged: onContextChanged.add,

	onOp: onOp.add
    };
};
