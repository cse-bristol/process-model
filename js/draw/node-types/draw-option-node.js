"use strict";

/*global module, require*/

module.exports = function(drawJunctions) {
    return function(nodes, newNodes, margins, newMargins) {
	drawJunctions.simple(nodes, newNodes);
    };
};
