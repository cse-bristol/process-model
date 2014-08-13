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

    var metadataTree = {
	'create': function(d, i, container) {
	    container.append("ul")
		.classed("metadata-tree", true);
	},
	'update': function(container, val, o) {
	    var around = function(node) {
		var li = node.selectAll("li")
			.data(function(d, i) {
			    return d;
			}).enter()
			.append("li");

		li.append("input")
		    .attr("type", "text")
		    .attr("value", function(d, i) {
			return d.name;
		    });

		li
		    .append("span")
		    .classed("more-metadata", true)
		    .text(function(d, i) {
			return d.value === undefined ? "→" : 
			    typeof d.value === "string" ? "" : "↓";
		    })
		    .on("click", function(d, i) {
			if (d.value === undefined) {
			    
			    var parent = d.parent,
				grandparent = parent.parent,
				child = {};

			    child[d.name] = "new value";
			    grandparent.value[parent.name] = child;

			} else if (typeof d.value === "string") {
			    throw new Error("Should never reach here.");

			} else {
			    var newKey = "new key";
			    while (d.value[newKey] !== undefined) {
				newKey += "+";
			    }
			    d.value[newKey] = "new value";
			}

			update();
		    });

		var children = li
			.filter(function(d, i) {
			    return d.value !== undefined;
			})
			.append("ul")
			.datum(function(d, i) {
			    if (typeof d.value === 'string') {
				return [{name: d.value, parent: d}];
			    } else {
				return Object.keys(d.value).map(function(k) {
				    return {value: d.value[k], name: k, parent: d};
				});
			    }
			});

		if (children.size() > 0) {
		    children.call(around);
		}
	    };

	    container.select('ul.metadata-tree')
		.selectAll('li')
		.remove();

	    container.select("ul.metadata-tree")
		.datum([{name: 'metadata', value: val}])
		.call(around);
	}
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