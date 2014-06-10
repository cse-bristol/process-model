"use strict";

/*global d3, FileReader, ProcessModel */

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.Files = function() {
    var toArray = function(filelist) {
	var arr = [];
	var len = filelist.length;
	for(var i = 0; i < len; i++) {
	    arr.push(filelist[i]);
	}
	
	return arr;
    };

    var module = {
	drop: function(container, onLoad) {
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
		    throw "No files found.";
		}

		files.forEach(function(file){
		    var reader = new FileReader();
		    reader.onload = function() {
			onLoad(file.name, reader.result);
		    };

		    reader.onerror = function(error) {
			throw "Failed to load file " + file.name + " " + error;
		    };

		    reader.readAsText(file);
		});
	    });
	}
    };
    return module;
}();
