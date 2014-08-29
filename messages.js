"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(container, update) {
    var messageDiv = container.append("div")
	    .classed("message-panel", true);

    var message = function(text, clazz) {
	    messageDiv.append("div")
	    .classed(clazz, true)
	    .text(text)
	    .transition()
	    .delay(5000)
	    .remove();
    };

    var m = {
	info: function(text) {
	    message(text, "info");
	},
	error: function(text) {
	    message(text, "error");
	    update();
	    throw new Error(text);
	}
    };
    return m;
};