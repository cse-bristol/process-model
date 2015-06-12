"use strict";

/*global module, require*/

var d3 = require("d3"),
    allowedTypes = require("../../state/graph/allowed-types.js"),
    constants = require("../drawing-constants.js"),
    buttonSize = constants.buttonSize,
    textXOffset = constants.textXOffset,
    textYOffset = constants.textYOffset;    

module.exports = function(getNodeCollection, transitions, viewport, update) {
    return function(nodes, newNodes, margins, newMargins) {
	var typeOptions = nodes
		.selectAll("g.node-choice")
		.data(
		    function(d, i) {
			return allowedTypes(d, getNodeCollection())
			    .values()
			    .map(function(option) {
				return {viewModel: d, option: option};
			    });
		    },
		    function (d, i) {
			return d.viewModel.id + "-" + d.option;
		    }
		);

	typeOptions.exit().remove();

	var newOptions = typeOptions.enter().append("g")
		.classed("node-choice", true)
		.classed("margin-button", true)	
		.classed("no-select", true)
		.each(function(d, i) {
		    d3.select(this).classed("node-choice-" + d.option, true);
		})
		.on("mousedown", function(d, i) {
		    /*
		     The click from this button won't become part of a drag event.
		     */
		    d3.event.stopPropagation();
		})
		.on("click", function(d, i) {
		    var nodeCollection = getNodeCollection(),
			replacementNode = nodeCollection.chooseNodeType(
			    nodeCollection.get(d.viewModel.id),
			    d.option
			);

		    if (viewport.getCentredNodeId() === d.viewModel.id) {
			viewport.centreNode(replacementNode.id);
		    }

		    update();
		});

	newOptions.append("rect")
	    .attr("width", buttonSize)
	    .attr("height", buttonSize);

	newOptions.append("text")
	    .attr("x", textXOffset)
	    .attr("y", textYOffset)
	    .text(function(d, i) {
		return d.option[0].toUpperCase();
	    });

	transitions.maybeTransition(typeOptions)
	    .attr("transform", function(d, i) {
		var horizontal = i * buttonSize,
		    vertical = d.viewModel.size[1] - buttonSize;
		
		return "translate(" + horizontal + "," + vertical + ")";
	    });
    };
};
