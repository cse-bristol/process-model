"use strict";

/*global require, module*/

var d3 = require("d3"),
    svgEditableText = require("./svg-editable-text.js"),
    /*
     Our blur event must be on a field inside the form, but hides the whole form.

     However, blur might have fired because we clicked on something else inside the form, so give that a chance to happen before we remove the whole thing.

     Yuck.
     */
    clickDelay = 100;

var command = function(c) {
    return function() {
	if (!document.execCommand(c)) {
	    throw new Error("Could not exec browser command " + c);
	}
    };
};

module.exports = function(dialogueContainer, toolbarContainer, transitions) {
    var target,
	charWidth = 15,

	dialogueThenCommand = function(fieldName, c) {
	    var selectionRange,
		form = dialogueContainer.append("form")
		    .classed("dialogue", true)
		    .style("visibility", "hidden")
		    .on("submit", function() {
			d3.event.preventDefault();
			d3.event.stopPropagation();

			form.style("visibility", "hidden");
			
			if (target) {
			    target.focus();
			    document.getSelection().removeAllRanges();
			    document.getSelection().addRange(selectionRange);
			    if (!document.execCommand(c, false, field[0][0].value)) {
				throw new Error("Could not exec browser command " + c + " with " + field.text());
			    }

			    d3.select(target)
				.selectAll("a")
				.attr("contenteditable", false);			    
			}
		    }),

		field = form
		    .append("input")
		    .attr("type", "text")
		    .on("blur", function(d, i) {
			window.setTimeout(
			    function() {
				form.style("visibility", "hidden");				
			    },
			    clickDelay
			);
		    });
	    
	    form.append("input")
		.attr("type", "submit");

	    return function() {
		if (target) {
		    var rect = target.getBoundingClientRect();

		    field.attr("placeholder", fieldName);

		    form
			.style("visibility", "visible")
			.style("top", (rect.top - 25) + "px")
			.style("left", (rect.left) + "px");

		    selectionRange = document.getSelection().getRangeAt(0);

		    field[0][0].value = "";
		    field[0][0].focus();
		}
	    };
	},

	commands = [
	    {icon: "B", styles: {"font-weight": "bold"}, f: command("bold")},
	    {icon: "I", styles: {"font-style": "italic"}, f: command("italic")},
	    {icon: "U", styles: {"text-decoration": "underline"}, f: command("underline")},
	    {icon: "•", f: command("insertUnorderedList")},
	    {icon: "1.", f: command("insertOrderedList")},
	    {icon: "⇐", f: command("outdent")},
	    {icon: "⇒", f: command("indent")},
	    {icon: "link", command: "createLink", f: dialogueThenCommand("Link-URL", "createLink")}, 
	    {icon: "img", command: "insertImage", f: dialogueThenCommand("Image-URL", "insertImage")} 
	];

    var bar = toolbarContainer.append("g")
	    .attr("id", "text-toolbar")
	    .attr("visibility", "hidden");

    var positionOnTarget = function() {
	if (target) {
	    var rect = target.getBoundingClientRect();
	    bar
		.attr("transform", "translate(" + rect.left + "," + rect.top + ")");
	}
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
	    d.f();
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
