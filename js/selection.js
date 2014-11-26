"use strict";

/*global require, module*/

module.exports = function(onNodeCollectionChanged, getNodeCollection) {
    var selectedVal,
	selectRoot = function() {
	    m.selected(
		getNodeCollection().root()
	    );
	},
	setupEvents = function() {
	    var coll = getNodeCollection();
	    
	    coll.onNodeCreate(m.selected);
	    
	    coll.onNodeDelete(function(deleted) {
		if (selectedVal === deleted) {
		    selectRoot();
		}
	    });
	    
	    coll.onEdgeDelete(function(deleted) {
		if (selectedVal === deleted) {
		    selectRoot();
		}
	    });
	    
	    coll.onNavigate(m.selected);
	};

    onNodeCollectionChanged(selectRoot);

    var m = {
	selected: function(val) {
	    if (val === undefined) {
		return selectedVal;
		
	    } else {
		if (selectedVal) {
		    selectedVal.selected = false;
		}

		selectedVal = val;
		val.selected = true;
		return m;
	    }
	}
    };

    return m;
};
