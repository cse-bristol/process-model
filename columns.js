"use strict";

/*global module, require*/

var d3 = require("d3"),
    clamp = require("./helpers").clamp,
    defaultColumnProp = 0.2,
    epsilon = 0.01;

var updateProportions = function(columns, proportions) {
    // Things which are close to 0 shall be 0.
    proportions.forEach(function(p, i) {
	if (p < epsilon) {
	    proportions[i] = 0;
	}
    });

    // Renormalise proportions to sum to 1.
    var weight = d3.sum(proportions);
    proportions.forEach(function(p, i) {
	proportions[i] = p / weight;
    });

    console.log("Columns resized to " + proportions);
    columns
	.transition()
	.style("width", function(d, i) {
	    return proportions[i] * 97 + "vw";
	});
};

/*
 Sets up resizeable columns.

 Columns should be a d3 selection. Each column except for the column[0] will get a drag handle on its left border.
 StartProportions are used to determine how big a column should be once it is displayed.
 StartHidden determines whether columns should be initially displayed with width 0 or with a width determined by their startProportion.

 Proportions are fractions of 1. They should add up to 1 at all times.
 */
module.exports = function(columns, startProportions) {
    if (columns[0].length !== startProportions.length) {
	throw new Error("Need a starting proportion for each column.");
    }

    if (!columns instanceof d3.selection) {
	throw new Error("Columns should be a d3 selection.");
    }

    if (!d3.sum(startProportions) === 1) {
	throw new Error("Column proportions should sum to 1.0.");
    }

    var proportions = startProportions;

    columns.classed("resizeable-column", true);

    // Set up some draggable/clickable borders.
    columns.each(function(d, i) {
	if (i === 0) {
	    return; // Don't need a left drag handle on the first column.
	}

	d3.select(this).append("div")
	    .classed("column-resize-handle", true)
	    .on("click", function(d, uninterestingChildI) {
		if (i === 0) {
		    throw new Error("Should never receive a resize event for the left border of the leftmost column.");
		}

		if (proportions[i] === 0) {
		    var shrinkColumn = i - 1;
		    while (proportions[shrinkColumn] === 0) {
			shrinkColumn -= 1;
			if (shrinkColumn < 0) {
			    throw new Error("Can't shrink any columns to the left of " + i);
			}
		    }

		    // Can't shrink the column to the left more than its current size.
		    var change = Math.min(defaultColumnProp, proportions[shrinkColumn]);

		    // Expand the column, reduce the column to the left.
		    proportions[i] = change;
		    proportions[shrinkColumn] -= change;
		} else {
		    // Contract the column, increase the column to the left.
		    proportions[i-1] += proportions[i];
		    proportions[i] = 0;
		}
		updateProportions(columns, proportions);
	    })
	    .call(d3.behavior.drag()
		  .origin(function(d, uninterestingChildI) {
		      return d3.event.x;
		  })
		  .on("dragstart", function(d, uninterestingChildI) {
		      /* Nothing else should get this click now. */
		      d3.event.sourceEvent.stopPropagation();
		  })
		  .on("drag", function(d, uninterestingChildI) {
		      var x = d3.event.dx,
			  sizeIncrease = clamp(
			      -proportions[i], 
			      (-x / window.innerWidth), 
			      proportions[i-1]);
		      
		      proportions[i] += sizeIncrease;
		      proportions[i-1] -= sizeIncrease;
		  })
		  .on("dragend", function() {
		      updateProportions(columns, proportions);      
		  }));
    });

    updateProportions(columns, proportions);
};