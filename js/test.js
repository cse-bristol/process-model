"use strict";

/*global require*/

var forEachModule = function(folder, callback) {
    return require("fs").readdirSync(folder)
	.filter(function(file) {
	    return file.split('.').pop() === "js";
	})
	.map(function(file) {
	    return callback(require(folder + "/" + file), file);
	});    
};

var testResults = forEachModule('./test', function(testModule, moduleName){
    var results = {};

    Object.keys(testModule).map(function(key) {
	var name = key.description ? key.description : key;

	try {
	    testModule[key]();
	    results[name] = true;
	} catch (e) {
	    results[name] = e;
	}
    });

    return {
	module: moduleName,
	results : results
    };
});

testResults.forEach(function(m) {
    console.log(m.module);
    Object.keys(m.results).forEach(function(key) {
	var result = m.results[key];
	if (result === true) {
	    console.log("\t " + key + " passed");
	} else {
	    console.error("\t " + key + " failed");
	    console.error("\t\t " + result.type);
	    console.error("\t\t " + result.message);

	    var indentedStack = result.stack.split('\n').join('\n\t\t');
	    console.error("\t\t " + indentedStack);
	}
	console.log();
    });
});
