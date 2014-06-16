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
		    throw "No files found.";
		}

		files.forEach(function(file){
		    var reader = new FileReader(),
			len = handlers.length,
			errors = [],
			success = false;

		    reader.onload = function() {
			for (var i = 0; i < len; i++) {
			    try {
				handlers[i](file.name, reader.result);
				success = true;
			    } catch (err) {
				errors.push(err);
			    }
			}

			if(!success) {
			    errors.forEach(function(err){
				console.log("A handler failed to load file " + file.name + " " + err + " " + err.stack);
			    });
			}
		    };

		    reader.onerror = function(err) {
			throw "Failed to load file " + file.name + " " + err + " " + err.stack;
		    };

		    reader.readAsText(file);
		});
	    });
	}
    };
    return module;
}();
