"use strict";

/*global d3, ProcessModel*/

if (!ProcessModel) {
    var ProcessModel = {};
}

ProcessModel.DrawEdges = function(container, transitions, update) {
    
    var drawPathsForEdges = function(edgeGroups) {
	var colourScale = d3.scale.linear()
		.domain([-1, 1])
		.range(["red", "green"])
		.interpolate(d3.interpolateLab);


	var edgePaths = edgeGroups.selectAll("path")
		.data(function(d, i){
		    return [d];
		});

	edgePaths.exit().remove();

	edgePaths.enter()
	    .append("path")
	    .attr("fill", "none");

	transitions.maybeTransition(edgePaths)
	    .attr("d", function(d, i){
		return d3.svg.line().interpolate("basis")(d.path, i);
	    })
	    .attr("stroke-width", function(d, i){
		if (!d.canModify() || d.necessity === undefined) {
		    return 1;
		}
		return d.necessity() + d.sufficiency();
	    })
	    .attr("stroke", function(d, i){
		if (!d.canModify() || d.necessity === undefined) {
		    return "black";
		}
		return colourScale(d.sufficiency() - d.necessity());
	    });
    };

    var drawEndsForEdges = function(edgeGroups) {
	var edgeEnds = edgeGroups.selectAll("circle")
		.data(function(d, i){
		    return [d];
		});

	edgeEnds.exit().remove();

	edgeEnds.enter()
	    .append("circle")
	    .on("click", function(d, i){
		if (d.canModify()) {
		    d.disconnect();
		    update();
		}
	    });
	transitions.maybeTransition(edgeEnds)
    	    .attr("r", function(d, i){
		if (d.canModify()) {
		    return 2;
		} else {
		    return 0;
		}
	    })
	    .attr("cx", function(d, i){
		return d.path[d.path.length - 1][0];
	    })
	    .attr("cy", function(d, i){
		return d.path[d.path.length - 1][1];
	    });
    };

    var drawNecessitySufficiency = function(groups, position) {
	var circleR = 5,
	    arc = d3.svg.arc()
		.outerRadius(circleR),
	    pie = d3.layout.pie()
		.sort(null)
		.value(function(d, i){
		    return d.value;
		}),
	    weights = groups.selectAll("g.weights")
		.data(function(d, i){
		    return [d];
		});

	weights.exit().remove();
	weights.enter().append("g")
	    .classed("weights", true)
	    .attr("width", circleR * 2)
	    .attr("height", circleR * 2);

	transitions.maybeTransition(weights)
	    .attr("transform", position)
	    .style("visibility", function(d, i){
		return d.canModify() ? "visible" : "hidden";
	    });

	var weightHalfs = weights.selectAll("g.weight-half")
		.data(function(d, i){
		    var necessity = d.canModify() ? d.necessity() : 0,
			antiNecessity = 1 - necessity,
			sufficiency = d.canModify() ? d.sufficiency() : 0,
			antiSufficiency = 1 - sufficiency;

		    var pieData = pie([
			{type: "necessity", color: "red", target: d, value: necessity},
			{type: "anti-necessity", color: "lightgray", target: d, value: antiNecessity},
			{type: "anti-sufficiency", color: "lightgray", target: d, value: antiSufficiency},
			{type: "sufficiency", color: "green", target: d, value: sufficiency}
		    ]);

		    return [
			[pieData[0], pieData[1]],
			[pieData[2], pieData[3]]
		    ];
		});

	weightHalfs.exit().remove();
	weightHalfs.enter()
	    .append("g")
	    .classed("weight-half", true);

	var weightingsPath = weightHalfs.selectAll("path")
		.data(function(d, i){
		    return d;
		});

	weightingsPath.exit().remove();
	weightingsPath.enter()
	    .append("path")
	    .attr("fill", function(d, i){
		return d.data.color;
	    })
	    .call(ProcessModel.Util.onScroll, function(d, i, change){
		var toChange = d.data.target;

		if (!toChange.canModify()) {
		    return;
		}

		switch(d.data.type) {
		case "necessity":
		case "anti-necessity":
		    toChange.necessity(toChange.necessity() + change);
		    break;

		case "sufficiency":
		case "anti-sufficiency":
		    toChange.sufficiency(toChange.sufficiency() + change);
		    break;
		}

		update();
	    });

	weightingsPath
	    .attr("d", arc);
    };

    var markNecessitySufficiencyForEdges = function(edgeGroups) {
	drawNecessitySufficiency(
	    edgeGroups.filter(function(d, i) {
		return d.necessity !== undefined;
	    }), 
	    function(d, i){
		return "translate(" + d.path[1][0] + "," + d.path[1][1] + ")";
	    });
    };

    return {
	draw: function(edgeData) {
	    var edges = container.selectAll("g.edge")
		    .data(edgeData);

	    edges.exit().remove();

	    edges.enter()
		.append("g")
		.classed("edge", true);

	    drawPathsForEdges(edges);
	    drawEndsForEdges(edges);

	    markNecessitySufficiencyForEdges(edges);
	}
    };
};