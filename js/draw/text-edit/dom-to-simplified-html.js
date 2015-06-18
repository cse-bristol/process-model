"use strict";

/*global module, require*/

var d3 = require("d3"),
    styleTags = d3.map({
	'b': {
	    alternatives: ['strong'],
	    style: "fontWeight",
	    styleValue: "bold"
	},
	'i': {
	    alternatives: ['em'],
	    style: 'fontStyle',
	    styleValue: 'italic'
	},
	'blockquote': d3.map({})
    }),
    
    a = {
	tag: "a",
	href: "href",
	extraText: " target=\"_parent\""
    },

    elementType = 1,
    textType = 3,

    br = {},

    sortMap = function(a, b) {
	return a.key.localeCompare(b.key);
    };

/*
 Inspects a DOM element's contents and children and creates a simplified HTML string representation of it.
 + Only <br> and the tags listed above are allowed.
 + Tags in the same position in the string will be written in alphabetical order when opening, and the reverse when closing.
 + Nested tags of the same type are removed.
 + Tags with no content are removed.
 + Tags which have an explicitly set style which corresponds to a tag listed above will be replaced by it.
 + Tags with a computed style of display: block will be replaced by one or more <br/> tags, unless they are already adjacent to <br/> tags.
 */
module.exports = function() {

    var parse = function(element) {
	/*
	 Parts represents a linear form of our DOM tree.
	 Each element in part may be:
         + A string, which will be included verbatim.
         + An array containing objects which
         + A br object.
	 */
	var parts = [""],
	    position = 0,
	    recentTags = {},

	    nearLineBreak = function() {
		for (var i = position; i >= 0; i--) {
		    if (parts[i] === br) {
			return true;
		    } else if (parts[i] === "") {
			// No-op
			
		    } else if (typeof(parts[i]) === "string") {
			return false;
		    }
		}
		return true;
	    },

	    pushContent = function(val) {
		if (parts[position] !== "") {
		    position++;
		}
		
		parts[position] = val;
	    },

	    advanceIfNotTags = function() {
		var current = parts[position];
		
		if (current === br || typeof(current) === "string") {
		    if (current !== "") {
			position++;
		    }
		    parts[position] = {
			open: {},
			close: {}
		    };
		}

		return parts[position];
	    },

	    openStyleTag = function(tagName) {
		var current = advanceIfNotTags();

		if (recentTags[tagName]) {
		    if (recentTags[tagName].close === null) {
			// Tag is already open.
			return false;
			
		    } else if (recentTags[tagName].close === position) {
			// Tag was closed in this position: undo that.
			recentTags[tagName].close = null;
			delete current.close[tagName];
			return true;
		    }
		}

		// This is now the open tag of this type.
		recentTags[tagName] = { open: position, close: null };
		current.open[tagName] = recentTags[tagName];
		return true;		
	    },

	    closeStyleTag = function(tagName) {
		var current = advanceIfNotTags();

		if (recentTags[tagName]) {
		    if (recentTags[tagName].open === position) {
			// The tag was opened in this position: undo that.
			recentTags[tagName] = null;
			delete current.open[tagName];
			return true;
		    }
		    
		    if (recentTags[tagName].close === null) {
			// Close the tag
			recentTags[tagName].close = position;
			current.close[tagName] = recentTags[tagName];
			return true;
			
		    } else {
			// The tag has already been closed.
			return false;
		    }
		    
		} else {
		    // Tag has not been opened yet.
		    return false;
		}
	    },

	    /*
	     Unlike style tags, anchor tags may be opened in the same position where another anchor tag has closed.

	     We also write down their href property.
	     */
	    openAnchorTag = function(href) {
		var current = advanceIfNotTags();

		if (recentTags[a.tag]) {
		    if (recentTags[a.tag].open === position) {
			// Can't open two anchors in the same position.
			return false;
		    }
		    
		    if (recentTags[a.tag].close === null) {
			// Previous anchor must be closed first.
			return false;
		    }
		    
		}

		// Open an anchor tag in this position.
		recentTags[a.tag] = { open: position, close: null, href: href};
		current.open[a.tag] = recentTags[a.tag];
		return true;
	    },

	    closeAnchorTag = function() {
		closeStyleTag(a.tag);
	    },

	    openElement = function(element) {
		var tagName = element.tagName.toLowerCase(),
		    opened = {
			style: d3.set(),
			anchor: false
		    };

		if (tagName === "br") {
		    /*
		     Handle br like inline text, because it doesn't have a closing tag or any children or attributes.
		     */
		    pushContent(br);

		} else if (tagName === a.tag) {
		    if (openAnchorTag(element.getAttribute(a.href))) {
			opened.anchor = true;
		    }
		    
		} else if (styleTags.has(tagName)) {
		    if (openStyleTag(tagName)) {
			opened.style.add(tagName);
		    }
		    
		} else {
		    /*
		     Look at the styles of this element and see if any of them match with the tags we care about.

		     If they do, treat them as the matching tag.

		     If they have that style, but with a different value, treat them as terminating the matching tag.
		     */
		    styleTags.forEach(function(tagName, options) {
			if (options.style) {
			    var val = element.style[options.style].toLowerCase();

			    if (val === options.styleValue) {
				if (openStyleTag(tagName)) {
				    opened.style.add(tagName);
				}
				
			    } else {
				/*
				 Ignore all other values. We could do something more complicated here with inverting tags, but it's probably not helpful.
				 */
			    }
			}
		    });
		}

		return opened;
	    },

	    parseRecursive = function(node) {
		switch (node.nodeType) {
		case elementType:
		    
		    var needsLineBreaks = (window.getComputedStyle(node)["display"].toLowerCase() === "block"),
		    openedTags = openElement(node);

		    if (needsLineBreaks && !nearLineBreak()) {
			pushContent(br);
		    }
		    
		    Array.prototype.forEach.call(
			node.childNodes,
			parseRecursive
		    );
		    
		    if (openedTags.anchor) {
			closeAnchorTag();
		    }
		    openedTags.style.forEach(function(tagName) {
			closeStyleTag(tagName);
		    });

		    break;
		    
		case textType:
		    pushContent(node.textContent);
		    break;
		    
		default:
		    // No-op
		    break;
		}
	    };

	parseRecursive(element);
	return parts;
    };
    
    return function(element) {
	var parts = parse(element),
	    result = [];

	parts.forEach(function(p) {
	    if (typeof(p) === "string") {
		result.push(p);
	    } else if (p === br) {
		result.push("<br>");
	    } else {
		/*
		 Sort by how nearby the opening tag is, then alphabetically by tag name.
		*/
		var closing = Object.keys(p.close);
		closing.sort(function(a, b) {
		    var aOpen = p.close[a].open,
			bOpen = p.close[b].open;
		    
		    if (aOpen === bOpen) {
			return b.localeCompare(a);
		    } else {
			return bOpen - aOpen;
		    }
		});

		result.push(
		    closing.map(function(tagName) {
			return "</" + tagName + ">";
		    }).join("")
		);

		/*
		 Sort by how nearby the closing tag is, then alphabetically by tag name.
		 Should come out in the reverse order to the closing tags.
		 */
		var opening = Object.keys(p.open);
		opening.sort(function(a, b) {
		    var aClose = p.open[a].close,
			bClose = p.open[b].close;

		    if (aClose === bClose) {
			return a.localeCompare(b);
		    } else {
			return bClose - aClose;
		    }
		});

		result.push(
		    opening.map(function(tagName) {
			var extraText = (tagName === a.tag) ? a.extraText : "";
			
			return "<" + tagName + extraText + ">";
		    }).join("")
		);		
	    }
	});

	return result.join("");
    };
};
