"use strict";

/*global require, module*/

module.exports = function(nodes) {
    var selected = nodes.root();

    var m = {
	selected: function(val) {
	    if (val === undefined) {
		return selected;
	    } else {
		if (selected) {
		    selected.selected = false;
		}

		selected = val;
		val.selected = true;
		return this;
	    }
	}
    };

    nodes.onCreate(m.selected);
    nodes.onRoot(m.selected);
    nodes.onNavigate(m.selected);

    return m;
};