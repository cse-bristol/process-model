"use strict";

/*global module, require*/

var d3 = require("d3");

var units = [
    /* These are made up numbers, because I only need it to be close enough and do not know where to get real numbers from. */

    1, // pixel
    20, // pixels per line
    20 * 20 // pixels per line * lines per page
];

module.exports = {
    onScroll : function(selection, f) {
	selection.on("wheel", function(d, i){
	    d3.event.stopPropagation();
	    d3.event.preventDefault();
	    
	    var change = d3.event.deltaY * units[d3.event.deltaMode] * -0.0003;

	    f(d, i, change);
	});
    },
    clamp: function(min, num, max) {
	return Math.max(min, Math.min(max, num));
    },
    all: function(list, f) {
	var len = list.length;
	for (var i = 0; i < len; i++) {
	    if (!f(list[i])) {
		return false;
	    }
	}
	return true;
    },
    any: function(list, f) {
	var len = list.length;
	for (var i = 0; i < len; i++) {
	    if (f(list[i])) {
		return true;
	    }
	}
	return false;
    },
    get: function(val) {
	if (typeof val === "function") {
	    return val();
	} else {
	    return val;
	}
    },
    maybeNum: function(val) {
	if (isNaN(val) || val === "") {
	    return val;
	} else {
	    return parseFloat(val);
	}
    },
    maybeBool: function(val) {
	if (val === "true") {
	    return true;
	} else if (val === "false") {
	    return false;
	} else {
	    return val;
	}
    }
};
