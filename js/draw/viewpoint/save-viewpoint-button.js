"use strict";

/*global module, require*/

module.exports = function(makeButton, getViewpointState, setSavedViewpoint) {
    return makeButton(
	"Set Viewpoint",
	null,
	function() {
	    setSavedViewpoint(
		getViewpointState()
	    );
	},
	{
	    onlineOffline: {
		online: true,
		offline: false
	    },
	    readWriteSync: {
		untitled: false,
		read: false,
		write: true,
		sync: true
	    }
	}
    );
};
