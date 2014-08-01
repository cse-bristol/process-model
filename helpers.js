"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Util = function(){
    var units = [
	/* These are made up numbers, because I only need it to be close enough and do not know where to get real numbers from. */

	1, // pixel
	20, // pixels per line
	20 * 20 // pixels per line * lines per page
    ];

    return {
	onScroll : function(selection, f) {
	    selection.on("wheel", function(d, i){
		d3.event.stopPropagation();
		d3.event.preventDefault();
		
		var change = d3.event.deltaY * units[d3.event.deltaMode] * -0.0003;

		f(d, i, change);
	    });
	}
    };
}();
