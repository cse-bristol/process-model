"use strict";

/*global module, require*/

var d3 = require("d3");

/*
 Collapses and expands nodes en masse.

 If no nodes are currently collapsed, collapses the root nodes.
 Otherwise, expands all the nodes which are currently collapsed, and collapses their children instead.

 This gives the appearance of progressively unfolding the graph, until everything is expanded. At that point, the next call will collapse it back down again.
 */
module.exports = function(makeButton, getNodesCollection, getLayoutState, update) {
    return makeButton(
	"Collapse",
	function() {
	    var toCollapse,
		toExpand,
		nodes = getNodesCollection(),
		layout = getLayoutState(),
		collapsed = layout.collapsed();

	    if (collapsed.empty()) {
		toExpand = d3.set();
		toCollapse = d3.set(
		    nodes.nodesWithoutParents()
			.filter(function(id) {
			    return nodes.get(id).edges().length > 0;
			})
		);
		
	    } else {
		toExpand = d3.set(
		    collapsed.values()
		);
		toCollapse = d3.set();
		
		toExpand.values().forEach(function(id) {
		    if (!nodes.has(id)) {
			toExpand.remove(id);
		    } else {
			nodes.get(id)
			    .edges()
			    .forEach(function(edge) {
				var collapseId = edge.node().id;

				if (toExpand.has(collapseId)) {
				    toExpand.remove(collapseId);
				} else {
				    if (edge.node().edges().length > 0) {
					toCollapse.add(collapseId);
				    }
				}
			    });
		    }
		});
	    }

	    toCollapse.forEach(function (id) {
		layout.setCollapsed(id, true);
	    });
	    
	    toExpand.forEach(function(id) {
		layout.setCollapsed(id, false);
	    });

	    update();
	},
	{
	}
    );
};
