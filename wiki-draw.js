"use strict";

/*global module, require*/

var d3 = require("d3");

module.exports = function(wikiStore, container) {
    var bar = container.append("div")
	    .attr("id", "wiki-controls");

    var load = bar.append("form")
	    .attr("id", "wiki-load")
	    .on("submit", function(d, i) {
		d3.event.preventDefault();
		wikiStore.load();
	    });


    var save = bar.append("form")
	.attr("id", "wiki-save")
	.on("submit", function(d, i) {
	    d3.event.preventDefault();
	    wikiStore.save();
	});

    save.append("input")
	.attr("type", "submit")
	.attr("value", "Save to Wiki");

    var saveUrl = save.append("input")
	    .attr("type", "text")
	    .attr("placeholder", "url of wiki")
	    .on("input", function(d, i) {
		wikiStore.saveUrl(this.value);
	    });

    save.append("span")
	.text("/<name of root node>");

    load.append("input")
	.attr("type", "submit")
	.attr("value", "Load from Wiki");

    var loadUrl = load.append("input")
	    .attr("type", "text")
	    .attr("placeholder", "url of root node")
	    .on("input", function(d, i) {
		wikiStore.loadUrl(this.value);
	    });

    return {
	update: function() {
	    saveUrl[0][0].value = wikiStore.saveUrl();
	    loadUrl[0][0].value = wikiStore.loadUrl();
	}
    };
};