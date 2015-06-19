"use strict";

/*global require, module, FileReader*/

var d3 = require("d3");

/*
 Provides drag and drop file loading.
 */
module.exports = function(handlers) {
    var toArray = function(filelist) {
	var arr = [];
	var len = filelist.length;
	for(var i = 0; i < len; i++) {
	    arr.push(filelist[i]);
	}
	
	return arr;
    };

    return {
	drop: function(container) {
	    container.on("dragover", function(d, i) {
		d3.event.preventDefault();
		d3.event.stopPropagation();
		d3.event.dataTransfer.dropEffect = "copy";
	    });

	    container.on("drop", function(data, index){
		d3.event.preventDefault();
		d3.event.stopPropagation();
		
		var files = toArray(d3.event.dataTransfer.files);

		if (files.length === 0) {
		    throw new Error("No files found.");
		}

		files.forEach(function(file){
		    var reader = new FileReader(),
			ext = file.name.split('.').pop(),
			handler = handlers[ext],
			success = false;

		    reader.onload = function() {
			if (!handler) {
			    throw new Error("No handlers for file " + file.name);
			} else {
			    handler(file.name, reader.result);
			}
		    };

		    reader.onerror = function(err) {
			throw new Error("Failed to load file " + file.name + " " + err + " " + err.stack);
		    };

		    reader.readAsText(file);
		});
	    });
	}
    };
};
