"use strict";

/*global require, module*/

var d3 = require("d3"),
    helpers = require("./helpers.js"),
    all = helpers.all,
    get = helpers.get;

/*
 Every time we receive a key press, we will look at the currently selected object's properties.
 If any of those properties has a subproperty keys, we an array and check whether it contains an entry for the pressed key.
 If it does, we assume its value is an array of objects. We iterate through the array looking for modifiers which match the event's modifier keys. 

 If we find a matching key and modifier, we swallow the event, call the property, and then finish.

 This is quite a slow method. If we find it is causing performance issues, we should rethink it and instead pre-extract the allowable keys for each type of thing.
 */

var lookup = d3.map({
    "U+007F": "del",
    "Enter": "enter",
    "Left": "left",
    "Right": "right",
    "Up": "up",
    "Down": "down",
    "U+00BB": "+",
    "U+00BD": "-"
});
var lookupKey = function(e) {
    // Handling keyboard commands in the browser is a gigantic mess. I have no idea how they managed to take such a simple thing and make it difficult.

    if (e.key) {
	// This is the standard. Firefox claims to not follow it, but actually does.
	// Chrome doesn't.
	return e.key;
    } else if (e.keyIdentifier) {
	if (lookup.has(e.keyIdentifier)) {
	    // Sometimes the keyIdentifier is a unicode code.
	    return lookup.get(e.keyIdentifier);
	}
    }

    // If nothing else works, this should at least handle the ASCII keys properly.
    return String.fromCharCode(e.keyCode).toLowerCase();
};

var tryKeys = function(key, event, keyHandlers, update, property) {
    for (var i = keyHandlers.length - 1; i >= 0; i--) {
	var option = keyHandlers[i];

	if (option.key === key) {
	    var modifiersMatch = all(['ctrlKey', 'shiftKey', 'altKey', 'metaKey'],
				     function(modifier) {
					 // Cooerce to boolean, then compare.
					 return (!event[modifier]) === (!option[modifier]);
				     });
	    
	    if (modifiersMatch) {
		event.preventDefault();
		event.stopPropagation();
		
		if (option.action !== undefined) {
		    option.action();
		} else {
		    property(get(option.value));
		}

		update();
		return true;
	    }
	}
    }
    return false;
};


module.exports = function(selection, zoom, update) {
    var universalKeys = [
	{
	    key: "+",
	    description: "zoom in",
	    shiftKey: true,
	    action: function() {
		zoom.scale(
		    zoom.scale() / 1.1
		);
	    }
	},
	{
	    key: "-",
	    description: "zoom out",
	    action: function() {
		zoom.scale(
		    zoom.scale() * 1.1
		);
	    }
	}
    ];

    document.addEventListener(
	"keydown", 
	function(e) {
	    if (e.target.getAttribute("contenteditable") || e.target.tagName.toLowerCase() === "input") {
		// Don't handle keys while we're in a text edit area.
		return;
	    }

	    var current = selection.selected(),
		props = Object.keys(current),
		key = lookupKey(e);

	    if (tryKeys(key, e, universalKeys, update, null)) {
		return;
	    }

	    if (current.keys !== undefined) {
		if (tryKeys(key, e, current.keys, update, null)) {
		    return;
		}
	    }

	    for (var prop in current) {
		var p = current[prop];
		if (p.keys !== undefined) {
		    if (tryKeys(key, e, p.keys, update, p)) {
			return;
		    }
		}
	    }
	},
	// Use capture
	false);
};