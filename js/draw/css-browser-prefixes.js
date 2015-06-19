"use strict";

/*global module, require*/

var prefixes = ["", "-moz-", "-o-", "-webkit-", "-ms-"];

/*
 Apply a css property to a d3 selection.

 This property will be given all of the relevant browser prefixes.

 (We could do detection here instead if that is preferable.)
 */
module.exports = function(selection, property, value) {
    prefixes.forEach(function(prefix) {
	selection.style(prefix + property, value);
    });
};
