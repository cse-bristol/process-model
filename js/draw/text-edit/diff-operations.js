"use strict";

/*global module, require*/

var diff = require("diff").diffChars;

/*
 Takes two strings in before and after form.

 Diffs them.

 Returns an array of text0 operations representing the changes needed to get from before to after.
*/
module.exports = function(before, after) {
    var changes = diff(before, after),
	i = 0,
	ops = [];

    changes.forEach(function(c) {
	// This depends on the diff algorithm returning a deletion before an insertion.
	if (c.removed) {
	    ops.push({
		p: i,
		d: c.value
	    });
	    
	} else if (c.added) {
	    ops.push({
		p: i,
		i: c.value
	    });

	    i += c.value.length;
	    
	} else {
	    i += c.value.length;
	}
    });

    return ops;
};
