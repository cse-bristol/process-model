"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Util = function(){
    return {
	onScroll : function(selection, f) {
	    selection.on("wheel.zoom", function(d, i){
		d3.event.stopPropagation();
		d3.event.preventDefault();

		var change = d3.event.deltaY * -0.0003;

		f(d, i, change);
	    });
	}
    };
}();
