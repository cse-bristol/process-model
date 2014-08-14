"use strict";

/*global require, module*/



module.exports = {
    toTable: function(o) {
	var table = [],
	    row = [];

	var toTableRecurse = function(arr, horizontal) {
	    arr.forEach(function(el) {
		while (horizontal > row.length) {
		    row.push({type: 'blank'});
		}

		row.push({
		    name: el.name,
		    obj: el,
		    parent: arr
		});

		toTableRecurse(el.children, horizontal + 1);

		table.push(row);
		row = [];
	    });
	};

	toTableRecurse(o, 0);
	return table;
    }
};