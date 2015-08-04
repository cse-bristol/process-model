"use strict";

/*global module, require*/

module.exports = function(makeButton, getViewpointState, setSavedViewpoint, onViewpointSaved) {
    return makeButton(
	"Set Viewpoint",
	null,
	function() {
	    setSavedViewpoint(
		getViewpointState()
	    );
	    onViewpointSaved();
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
