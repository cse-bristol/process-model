"use strict";

/*global require, module*/

var d3 = require("d3");

var link = function(args) {
    // createLink(url)
    throw new Error("Not implemented");
};

var image = function(args) {
    // insertImage(srcUrl)
    throw new Error("Not implemented");
};

module.exports = function(container, transitions) {
    var target,
	charWidth = 15,
	commands = [
	{icon: "B", styles: {"font-weight": "bold"}, command: "bold"},
	{icon: "I", styles: {"font-style": "italic"}, command: "italic"},
	{icon: "U", styles: {"text-decoration": "underline"}, command: "underline"},
	{icon: "•", command: "insertUnorderedList"},
	{icon: "1.", command: "insertOrderedList"},
	{icon: "⇐", command: "outdent"},
	{icon: "⇒", command: "indent"},
	{icon: "link", command: "createLink"}, 
	{icon: "img", command: "insertImage"} 
    ];

    var bar = container.append("g")
	    .attr("id", "text-toolbar")
	    .attr("visibility", "hidden");

    var positionOnTarget = function() {
	var rect = target.getBoundingClientRect();
	transitions.maybeTransition(bar)
	    .attr("transform", "translate(" + rect.left + "," + rect.top + ")");
    };

    var len = 0;
    var buttons = bar
	    .selectAll("g")
	    .data(commands)
	    .enter()
	    .append("g")
	    .classed("text-button", true)
	    .attr("transform", function(d, i) {
		var result = "translate(" + ((charWidth * len) - 8) + ",-30)";
		len += d.icon.length;
		return result;
	    });

    buttons.append("rect")
	.attr("height", "20")
	.attr("width", function(d, i) {
	    return d.icon.length * charWidth;
	});

    buttons.append("text")
	.classed("text-button-icon", true)
	.text(function(d, i) {
	    return d.icon;
	})
	.on("mousedown", function(d, i) {
	    d3.event.stopPropagation();
	    d3.event.preventDefault();
	    var args = d.args ? d.args : [];
	    document.execCommand(d.command);
	})
	.attr("x", 3)
	.attr("y", 16)
	.each(function(d, i) {
	    if (d.styles) {
		var el = d3.select(this);
		d3.map(d.styles).entries().forEach(function(e) {
		    el.style(e.key, e.value);
		});
	    }
	});

    return {
	blur: function(d, i) {
	    target = null;
	    bar.attr("visibility", "hidden");
	},
	focus: function(d, i) {
	    var rect = this.getBoundingClientRect();
	    target = this;
	    positionOnTarget();
	    bar.attr("visibility", "visible");
	},
	update: function(d, i) {
	    positionOnTarget();
	}
    };
};