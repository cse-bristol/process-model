"use strict";

/*global require, module*/

var d3 = require("d3"),
    _ = require("lodash"),
    combineEvidence = require("./combine-evidence.js"),
    helpers = require("../../helpers.js"),
    clamp = helpers.clamp,
    callbacks = helpers.callbackHandler;

var spaceToToggle = function(prop) {
    prop.keys = [{
	key: " ",
	description: "toggle",
	value: function() {
	    return !prop();
	}
    }];
};

var increaseDecreaseKey = function(prop, key, step) {
    prop.keys = [
	{
	    key: key,
	    description: "increase",
	    value: function() {
		return prop() + step;
	    }
	},
	{
	    key: key,
	    shiftKey: true,
	    description: "decrease",
	    value: function() {
		return prop() - step;
	    }
	}
    ];
};

module.exports = d3.map({
    "process": function(node){
	node.help = "An activity that realizes a transformation.";

	var localE = [Math.random() / 2, 0.5 + (Math.random() / 2)],
	    localDep = 1;

	node.allowedChildren = d3.set(["process", "issue", "option"]);

	node.hasChildProcesses = function() {
	    return _.any(node.edges(), function(e) {
		return e.node().type === "process";
	    });
	};

	node.localEvidence = function(evidence) {
	    if (evidence !== undefined) {
		if (evidence[0] < 0) {
		    evidence[0] = 0;
		} else if (evidence[0] > 1) {
		    evidence[0] = 1;
		}
		if (evidence[1] < 0) {
		    evidence[1] = 0;
		} else if (evidence[1] > 1) {
		    evidence[1] = 1;
		}
		if (evidence[0] > evidence[1]) {
		    var mid = (evidence[0] + evidence[1]) / 2;
		    evidence[0] = mid;
		    evidence[1] = mid;
		}

		localE = evidence;
		return node;
	    }
	    return localE;
	};
	node.localEvidence.help = "Local evidence about this process represented as an interval probability [Sn, Sp] and displayed as an Italian flag. This value is only valid on leaf nodes, and must satisfy the constraint 0 <= Sn <= Sp <= 1. Change these values within these ranges by hovering over the appropriate section of the Italian flag and scrolling the mousewheel.";

	var changeEvidence = function(i, direction) {
	    return function() {
		var e = node.localEvidence().slice();
		e[i] += direction * 0.05;
		return e;
	    };
	};
	node.localEvidence.keys = [
	    {
		key: 'p',
		description: 'increase evidence of success',
		value: changeEvidence(1, -1)
	    },
	    {
		key: 'p',
		shiftKey: true,
		description: 'decrease evidence of success',
		value: changeEvidence(1, 1)
	    },
	    {
		key: 'n',
		description: 'increase evidence of failure',
		value: changeEvidence(0, 1)
	    },
	    {
		key: 'n',
		shiftKey: true,
		description: 'decrease evidence of failure',
		value: changeEvidence(0, -1)
	    }
	];

	node.dependence = function(dependence) {
	    if (dependence !== undefined) {
		if (_.isNumber(dependence) && !_.isNaN(dependence)) {
		    localDep = clamp(0, dependence, 1);
		} else {
		    throw new Error("Dependence must be a number " + dependence);
		}
	    }
	    
	    return localDep;
	};
	node.dependence.help = "The relatedness of evidence propagated up from children of this process. This varies from 0 to 1, and is represented as the proportion of the junction circle which is coloured black. 0 is entirely white, and represents completely independent evidence. 1 is entirely black, and represents equivalent evidence. This value only makes sense on process which have children with evidence. It may be changed by hovering over the junction circle and scrolling the mousehweel.";
	increaseDecreaseKey(node.dependence, "d", 0.05);

	node.p = function() {
	    if (!node.hasChildProcesses()) {
		return localE;
	    } else {
		return combineEvidence(localDep, node.edges()
						    .filter(function(e) {
							return e.node().type === "process";
						    })
						    .map(function(e){
							return {
							    necessity: e.necessity(),
							    sufficiency: e.sufficiency(),
							    evidence: e.node().p()
							};
						    }));
	    }
	};
	node.p.help = "The evidence for this node propagated up from its children and represented as an Italian flag. This is only valid for a node which has children with evidence. It is a derived value, and may not be modified";

	node.extendIncomingEdge = function(edge) {
	    var necessity = 0.5,
		sufficiency = 0.5;
	    
	    edge.necessity = function(n) {
		if (n !== undefined) {
		    necessity = clamp(0, n, 1);
		    return edge;
		}
		return necessity;
	    };
	    edge.necessity.help = "Necessity weights the importance of a child process' evidence to the parent, and may be thought of as P(¬H|¬E). It may range from 0 to 1 inclusive. It is represented as a red semi-circle. Hover over it and scroll the mouse whell to modify it.";
	    increaseDecreaseKey(edge.necessity, "n", 0.05);

	    edge.sufficiency = function(s) {
		if (s !== undefined) {
		    sufficiency = clamp(0, s, 1);
		    return edge;
		}
		return sufficiency;
	    };
	    increaseDecreaseKey(edge.sufficiency, "s", 0.05);
	    edge.sufficiency.help = "Sufficiency weights the importance of a child process' evidence to the parent, and may be thought of as P(H|E). It may range from 0 to 1 inclusive. It is represented as a green semi-circle. Hover over it and scroll the mouse whell to modify it.";
	    return edge;
	};
    },

    "issue": function(node) {
	node.help = "A concern or question about the Process, subjected to debate and discussion.";

	var settled = false;

	node.allowedChildren = d3.set(["option"]);
	node.settled = function(val) {
	    if (val === undefined) {
		return settled;
	    } else {
		settled = val;
		return node;
	    }
	};
	node.settled.help = "Whether the issue is settled or open. Click on the text to toggle its value.";
	spaceToToggle(node.settled);
    },

    "option": function(node) {
	node.help = "Possible answers, alternatives or courses of action in reply to the Issue.";

	node.allowedChildren = d3.set(["argument", "option"]);
    },

    "argument": function(node) {
	node.help = "Evidence, reason or opinions in favor or against an Option.";

	var support = false;

	node.allowedChildren = d3.set();
	node.support = function(val) {
	    if (val === undefined) {
		return support;
	    } else {
		support = val;
		return node;
	    }
	};
	node.support.help = "Whether the argument supports or refutes the option. Click on the text to toggle its value.";
	spaceToToggle(node.support);
    }
});

module.exports.set("undecided", function(node) {
    node.help = "A choice between many possible kinds of nodes.";

    node.allowedChildren = d3.set();

    node.chooseType = function(nodeContainer, option) {
	return nodeContainer.chooseNodeType(node, option);
    };
    node.chooseType.help = "Click on a letter to choose the type of this node.";
    node.chooseType.keys = module.exports.keys()
	.map(function(k) {
	    return {
		key: k[0],
		description: "choose " + k,
		value: k,
		action: function(nodeContainer) {
		    return nodeContainer.chooseNodeType(node, k);
		}
	    };
	});
});
