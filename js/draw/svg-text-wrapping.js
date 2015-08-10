"use strict";

/*global module, require*/

var _ = require("lodash"),
    charsPerW = 0.13,
    lineBreak = /[\r\n]+/,
    wordBreak = /[ \t]+/;

var clamp = function(num) {
    return Math.max(
	parseInt(num),
	1
    );
};

/*
 Takes a d3 selection of SVG text elements, along with functions to get the text, and desired width and height.

 All the text elements in the selection must have the same font and font-sizes.

 Double line-breaks will be ignored.
 */
module.exports = function(textElement, getText, getWidth, getHeight) {
    var lineHeight = parseInt(
	document.defaultView.getComputedStyle(textElement.node()).fontSize
    ),
	linesPerH = 1 / lineHeight,
	charW = {},

	measureEl = textElement.append("tspan")
	    .attr("id", "measure-word-length")
	    .datum({ fake: true }),

	measure = function(word) {
	    if (!word) {
		return 0;
	    } else if (!charW[word]) {
		measureEl.text(word);
		var len = measureEl.node().getComputedTextLength();
		charW[word] = len;

		return len;
	    } else {
		return charW[word];
	    }
	},

	truncate = function(word, w) {
	    var len = word.length;
	    
	    while (measure(word) > w) {
		word = word.substring(0, len - 1);
		len -= 1;
	    }
	    return word.substring(0, len - 2) + "..";
	};
    
    var tspans = textElement.selectAll("tspan")
	    .filter(function(d, i) {
		return !d.fake;
	    })
	    .data(
		function(d, i) {
		    var w = getWidth(d),
			h = getHeight(d),
			// charsPerSpan = clamp(charsPerW * w),
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
				wordLength = measure(word);
			    
			    if (wordLength > w) {
				// Truncate words which are too wide to fit.
				word = truncate(word, w);
				wordLength = measure(word);
			    }

			    if (!current) {
				current = word;
				currentLength = wordLength;

			    } else if (currentLength + wordLength < w) {
				current += " " + word;
				currentLength += measure(" ") + wordLength;
				
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
			spans[spans.length - 1] = truncate(last, w);
		    }

		    return spans;
		});

    measureEl.remove();

    tspans.exit().remove();

    tspans.enter()
	.append("tspan");

    tspans
    	.attr("x", function(d, i) {
	    return 0;
	})
	.attr("y", function(d, i) {
	    return (1 + i) * lineHeight;
	})
	.text(function(d, i) {
	    return d;
	});
};
