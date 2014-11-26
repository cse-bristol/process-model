"use strict";

/*global module, require*/

module.exports = function(loadModel, merge, update) {
    return {
	text: "Insert",
	f: function(name) {
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
	onlineOnly: true,

	search: {}
    };
};
