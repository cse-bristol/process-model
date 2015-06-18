"use strict";

/*global module, require*/

var _ = require("lodash"),
    charsPerW = 0.13,
    linesPerH = 0.063,
    heightOffset = 15,
    lineBreak = /[\r\n]+/,
    wordBreak = /[ \t]+/;

var clamp = function(num) {
    return Math.max(
	parseInt(num),
	1
    );
};

// TODO double line separator
module.exports = function(textElement, getText, getWidth, getHeight) {
    var tspans = textElement.selectAll("tspan")
	    .data(
		function(d, i) {
		    var w = getWidth(d),
			h = getHeight(d),
			charsPerSpan = clamp(charsPerW * w),
			maxLines = clamp(linesPerH * h),
		    
			text = getText(d, i),
			lines = text.split(lineBreak),
			spans = [],
			overflow = false;

		    lines.forEach(function(line) {
			var words = line.split(wordBreak),
			    current,
			    currentLength;

			if (overflow || spans.length >= maxLines) {
			    overflow = true;
			    return;
			}

			for (var i = 0, len = words.length; i < len; i++) {
			    var word = words[i],
				wordLength = word.length;
			    
			    if (wordLength > charsPerSpan) {
				// Truncate words which are too wide to fit.
				word = word.substring(0, charsPerSpan - 2) + "..";
				wordLength = charsPerSpan;
			    }

			    if (!current) {
				current = word;
				currentLength = wordLength;

			    } else if (currentLength + wordLength < charsPerSpan) {
				current += " " + word;
				currentLength += 1 + wordLength;
				
			    } else {
				spans.push(current);

				if (spans.length >= maxLines) {
				    overflow = true;
				    break;
   				}
				
				current = word;
				currentLength = wordLength;
			    }
			}
			
			if (!overflow && current && current.length > 0) {
			    spans.push(current);
			}
		    });

		    if (overflow) {
			var last = spans[spans.length - 1];
			spans[spans.length - 1] = last.substring(0, charsPerSpan - 2) + "..";
		    }

		    return spans;
		});

    tspans.exit().remove();

    tspans.enter()
	.append("tspan");

    tspans
    	.attr("x", function(d, i) {
	    return 0;
	})
	.attr("y", function(d, i) {
	    return 15 + (i * heightOffset);
	})
	.text(function(d, i) {
	    return d;
	});
};
