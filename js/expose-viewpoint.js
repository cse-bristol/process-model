"use strict";

/*global module, require, window*/

var d3 = require('d3');

/*
 Listens for messages on the window which have the string 'getViewpoint' as a payload.

 Replies by sending back a message containing a serialized form of the current viewpoint.

 This is used by the Steep VisualEditor Extension at [https://github.com/cse-bristol/steep-mediawiki-gadgets] to allow a 'set Viewpoint' button in a parent window.
*/
module.exports = function(viewpoint) {
    d3.select(window)
	.on('message', function() {
            if (d3.event.data === 'getViewpoint') {
		d3.event.source.postMessage(
                    {
			viewpoint: JSON.stringify(
			    viewpoint.getSerializedState()
			)
                    },
                    window.location.origin
		);
            }
	});
};
