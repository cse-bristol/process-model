"use strict";

/*global require, module*/

var d3 = require("d3"),
    _ = require("lodash"),
    helpers = require("./helpers.js"),
    all = _.every,
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
    "F1": "f1",
    "U+001B": "esc",
    "U+00BB": "+",
    "U+00BD": "-"
});
var lookupKey = function(e) {
    // Handling keyboard commands in the browser is a gigantic mess. I have no idea how they managed to take such a simple thing and make it difficult.

    if (e.key) {
	// This is the standard. Firefox claims to not follow it, but actually does.
	// Chrome doesn't.
	return e.key.toLowerCase();
    } else if (e.keyIdentifier) {
	if (lookup.has(e.keyIdentifier)) {
	    // Sometimes the keyIdentifier is a unicode code.
	    return lookup.get(e.keyIdentifier);
	}
    }

    // If nothing else works, this should at least handle the ASCII keys properly.
    return String.fromCharCode(e.keyCode).toLowerCase();
};

/*
 Attempts to find a matching key in the keyHandlers list. Returns true and calls the update() function if one was found.

 property is optional. It represents a property setter, which will be called if a matching keyhandler is found, but has no action.
 */
var tryKeys = function(key, event, keyHandlers, update, nodeContainer, property) {
    for (var i = keyHandlers.length - 1; i >= 0; i--) {
	var option = keyHandlers[i];

	if (option.key === key) {
	    var modifiersMatch = all(['ctrlKey', 'shiftKey', 'altKey', 'metaKey'],
				     function(modifier) {
					 // Cooerce to boolean, then compare.
					 return (!event[modifier]) === (!option[modifier]);
				     }),
		textEdit = event.target.getAttribute("contenteditable") || event.target.tagName.toLowerCase() === "input";
		
	    modifiersMatch = modifiersMatch && (!textEdit) === !option.textEdit;
	    
	    if (modifiersMatch) {
		event.preventDefault();
		event.stopPropagation();
		
		if (option.action !== undefined) {
		    option.action(nodeContainer);
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


module.exports = function(selection, helpLink, zoom, update, getNodeCollection) {
    var universalKeys = [
	{
	    key: "+",
	    description: "zoom in",
	    shiftKey: true,
	    action: zoom.in
	},
	{
	    key: "-",
	    description: "zoom out",
	    action: zoom.out
	},
	{
	    key: "f1",
	    description: "get help",
	    action: function() {
		window.location = helpLink.attr("href");
	    }
	}
    ];

    document.addEventListener(
	"keydown", 
	function(e) {
	    var current = selection.selected(),
		nodeContainer = getNodeCollection();

	    if (!current) {
		return;
	    }

	    var props = Object.keys(current),
		key = lookupKey(e);

	    if (tryKeys(key, e, universalKeys, update, nodeContainer, null)) {
		return;
	    }

	    if (current.keys !== undefined) {
		if (tryKeys(key, e, current.keys, update, nodeContainer, null)) {
		    return;
		}
	    }

	    for (var prop in current) {
		var p = current[prop];
		if (p.keys !== undefined) {
		    if (tryKeys(key, e, p.keys, update, nodeContainer, p)) {
			return;
		    }
		}
	    }
	},
	// Use capture
	false);

    return {
	universalKeys: function() {
	    return universalKeys;
	}
    };
};