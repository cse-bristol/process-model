"use strict";

/*global require, module, FileReader*/

var d3 = require("d3");

module.exports = function() {
    var toArray = function(filelist) {
	var arr = [];
	var len = filelist.length;
	for(var i = 0; i < len; i++) {
	    arr.push(filelist[i]);
	}
	
	return arr;
    };

    var module = {
	drop: function(container, handlers) {
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
			len = handlers.length,
			success = false;

		    reader.onload = function() {
			var ext = file.name.split('.').pop();
			var matching = handlers.filter(function(h) {
			    return h.extensions.indexOf(ext) >= 0;
			});

			if (matching.length === 0) {
			    throw new Error("No handlers for file " + file.name);
			} else if (matching.length > 1) {
			    throw new Error("Too many handlers for file " + file.name);
			} else {
			    matching[0](file.name, reader.result);			    
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
    return module;
}();
