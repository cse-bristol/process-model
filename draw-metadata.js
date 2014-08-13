"use strict";

/*global module, require*/

var d3 = require("d3"),
    all = require("./helpers.js").all;

var withLabel = function(f) {
    return {
	'create': function(d, i, container) {
	    container.append('h5')
		.classed('metadata-label', true)
		.text(d.prop);

	    f.create(d, i, container);
	},
	'update' : f.update
    };
};

var text = function(onClick) {
    return {
	'create': function(d, i, container) {
	    container.append('p')
		.classed("metadata-text-readonly", true);
	},
	'update': function(container, val, o) {
	    var p = container.select('p.metadata-text-readonly')
		.text(val);

	    if (onClick) {
		p.on("click", onClick(o));
	    }
	}
    };
};

var link = {
    'create': function(d, i, container) {
	container.append('a')
	    .classed('metadata-link', true);
    },
    'update': function(container, vals, o) {
	container.select("a.metadata-link")
	    .attr('href', vals[0])
	    .text(vals[0] ? vals[1] : "");
    }
};

var metadataTree = {
    'create': function(d, i, container) {
	// TODO
	
    },
    'update': function(d, i, container, o) {
	// TODO
    }
};

var get = function(val) {
    if (val instanceof Function) {
	// If val is a function, we'll treat it as a getter.
	return val();
    } else {
	// Otherwise, assume it's already been gotten.
	return val;
    }
};

module.exports = function(container, select, update) {
    var editableText = {
	'create': function(d, i, container) {
	    container.append('textarea')
		.classed('metadata-text-editable', true);
	},
	'update': function(container, val, o) {
	    /* We set the value on the textarea DOM element instead of using D3, since it wasn't working correctly. Tried all of the following:

	     .text(val) 
	     .attr('value', val)
	     .html(val)
	     */

	    container.select("textarea.metadata-text-editable")
		.on('change', function(d, i) {
		    o[d.prop](d3.event.target.value);
		    update();
		})[0][0].value = val;
	}
    };

    var selectNode = function(o) {
	return function(d, i) {
	    select(o);
	    update();
	};
    };

    var fields = [
	{'prop': 'type', display: withLabel(text())},
	{'prop': 'name', display: withLabel(editableText)},
	{'prop': 'url', display: withLabel(editableText)},
	{'prop': ['url', 'name'], key: 'clickable-link', display: link},
	{'prop': 'description', display: withLabel(editableText)},
	{'prop': 'parent', display: withLabel(text(selectNode))},
	{'prop': 'child', display: withLabel(text(selectNode))},
	{'prop': 'metadata', display: metadataTree}
    ];

    var div = container.append("div").classed("metadata", true);

    return {
	draw: function(current) {
	    var currentFields = fields.filter(function(f) {
		var p = f.prop;
		if (!(p instanceof Array)) {
		    p = [p];
		}

		return all(p, function(prop) {
		    return current[prop] !== undefined;
		});
	    });

	    var fieldDivs = div.selectAll("div")
		.data(currentFields, function(d, i) {
		    return d.key ? d.key : d.prop;
		});

	    fieldDivs.exit().remove();
	    fieldDivs.enter().append("div")
		.classed("metadata-field", true)
		.each(function(d, i) {
		    d.display.create(d, i, d3.select(this));
		});

	    fieldDivs.each(function(d, i) {
		var vals = d.prop instanceof Array ?
			d.prop.map(function(p) {
			    return get(current[p]);
			}) :
			get(current[d.prop]);

		
		d.display.update(d3.select(this), vals, current);
	    });
	}
    };
};