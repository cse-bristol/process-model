"use strict";

/*global module, require*/

module.exports = function(loadModel, merge, update, makeButton, searchProcess) {
    return makeButton(
	"Insert",
	function(menuState, ownsCurrentProcess) {
	    return ownsCurrentProcess;
	},
	searchProcess(
	    function(name) {
		loadModel(
		    name,
		    function(toInsert) {
			merge(toInsert);
			update();
		    },
		    function() {
			throw new Error("Attempted to import a collection, but it has been deleted " + name);
		    });
	    },		
	    {}
	),
	{
	    onlineOffline: {
		online: true,
		offline: false
	    }
	}
    );
};
