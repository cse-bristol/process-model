"use strict";

/*global module, require*/

var d3 = require("d3"),
    all = require("./helpers.js").all,
    metadataTreeMaker = require("./metadata-tree.js");

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
	try {
	    return val();
	} catch (e) {
	    return "";
	}
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
	create: function(d, i, container) {
	    container.append('table')
		.classed('metadata-tree', true)
		.append("tbody");
	},
	update: function(container, val, o) {
	    if (val.length === 0) {
		val.push({name: "", children: []});
	    }

	    var table = metadataTreeMaker.toTable(val);

	    var tbody = container.select("table.metadata-tree").select("tbody");
	    tbody.selectAll("tr").remove();

	    var rows = tbody
		.selectAll("tr")
		.data(table);

	    rows.exit().remove();
	    rows.enter().append("tr");

	    var cells = rows.selectAll("td")
		.data(function(d, i) {
		    return d;
		});

	    var td = cells.enter()
		    .append("td")
		    .append("div")
		    .classed("metadata-tree-field", true);


	    var nonBlank = td.filter(function(d, i) {
		    return d.type !== 'blank';
		});

	    nonBlank
		.append("input")
		.attr("type", "text")
		.attr("value", function(d, i) {
		    return d.name;
		})
		.on("change", function(d, i) {
		    d.obj.name = d3.event.target.value;
		    update();
		});

	    nonBlank.append("span")
		.text("x")
		.classed("metadata-tree-control", true)
		.on("click", function(d, i) {
		    d.parent.splice(d.parent.indexOf(d.obj), 1);
		    update();
		});

	    nonBlank
		.filter(function(d) {
		    return d.parent.indexOf(d.obj) === (d.parent.length - 1);
		})
		.append("span")
		.text("↓")
	    	.classed("metadata-tree-control", true)
		.on("click", function(d, i) {
	    	    d.parent.push({name: "", children: []});
		    update();
		});

	    nonBlank
		.filter(function(d) {
		    return d.obj.children.length === 0;
		})
		.append("span")
		.text("→")
	    	.classed("metadata-tree-control", true)
		.on("click", function(d, i) {
		    d.obj.children.push({name: "", children: []});
		    update();
		});
	}
    };

    var slider = {
	create: function(d, i, container) {
	    container.append("input")
		.classed("metadata-slider", true)
		.attr("type", "range")
		.attr("min", 0)
		.attr("max", 1)
		.attr("step", 0.05);
	},
	update: function(container, val, o) {
	    container
		.select(".metadata-slider")
		.on("change", function(d, i) {
		    o[d.prop](d3.event.target.value);
		    update();
		})[0][0].value = val;
	}
    };

    var checkbox = {
	create: function(d, i, container) {
	    container.append("input")
		.classed("metadata-toggle", true)
		.attr("type", "checkbox");
	},
	update: function(container, val, o) {
	    container.select(".metadata-toggle")
	    .on("change", function(d, i) {
		o[d.prop](this.checked);
		update();
	    })[0][0].checked = val;
	}
    };

    var fields = [
	{'prop': 'type', display: withLabel(text())},
	{'prop': 'name', display: withLabel(editableText)},
	{'prop': 'url', display: withLabel(editableText)},
	{'prop': ['url', 'name'], key: 'clickable-link', display: link},
	{'prop': 'dependence', display: withLabel(slider)},
	{'prop': 'support', display: withLabel(checkbox)},
	{'prop': 'settled', display: withLabel(checkbox)},
	{'prop': 'necessity', display: withLabel(slider)},
	{'prop': 'sufficiency', display: withLabel(slider)},
	{'prop': 'parent', display: withLabel(text(selectNode))},
	{'prop': 'child', display: withLabel(text(selectNode))},
	{'prop': 'metadata', display: withLabel(metadataTree)}
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