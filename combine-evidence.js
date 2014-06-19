"use strict";

/*global ProcessModel*/

if (!ProcessModel) {
    ProcessModel = {};
}

/* 
 Based on Alistair Fletcher and John Davis, 'Dialectical Evidence Assembly for Discovery' in Discovery Science DS2003.

 Note that all the probabilities discussed here are interval probabilities of the form [Sn, Sp], where Sn represents certain negative, Sp represents (1 - certain positive), and (Sp - Sn) represents uncertainty.

 To correctly combine n items of evidence E, we should make a matrix of the probabilities of all their possible combinations P(θ) (it will have 2^n cells). We should then specify a conditional probability P(H|θ) for the hypothesis H.

 Evaluate the following over all combinations to get the liklihood of H.
 sum(P(H|θi)*P(θi))

 In practice, we are unlikely to know the full set of combinations of probabilities P(Ei), nor the full set of conditional probabilities P(H|Ei), so we cannot evaluate this.

 We make the following simplifications, so that we can make this calculation when less is known:
 1. The dependencies between evidence are unknown. We approximate them with a single value 'dependence' at each connecting node.

 2. We specify two numbers P(H|E) and P(¬H|¬E) (sufficiency and necessity) per item of evidence E. 

 3. We assume that P(H|¬E) and P(¬H|E) are 0 (which is a conservative assumption).
 */
ProcessModel.CombineEvidence = function(dependence, evidence) {
    var getSn = function(interval) {
	return interval[0];
    };

    var getSp = function(interval) {
	return interval[1];
    };

    var generateCombinations = function(intervals, length) {
	if (intervals === [] || length === 0) {
	    return [];
	}

	var first = intervals[0],
	    rest = intervals.slice(1);

	return generateCombinations(rest, length - 1).map(function(f){
	    first.concat(f);
	}).concat(generateCombinations(rest, length));
    };

    /* 
     Produce the term P(H|E)*P(E) for each item of evidence.
     
     NOTE: this may be the wrong order. Our dependence value rho is now combining P(H|E)*P(E) when it is only justified for combining P(E). 

     However, since no method to combine the necessities and sufficiencies from multiple kinds of evidence is given, I've assumed it is this way around.
     */

    var intervals = evidence.map(function(e){
	var sn = e.evidence[0],
	    sp = e.evidence[1];

	return [
	    e.necessity * sn,
	    /* The 'goodness' is actually 1-Sp(E), since that is the distance to the end of the bar. 
	     Scale this 'goodness' based on sufficiency.
	     Then, take the scaled goodness off the end of the new bar.
	     */

	    1 - (e.sufficiency * (1 - sp))
	];
    });

    /*
     Combine the items of evidence using the dependence weighting.
     */
    var signTimesDependence = dependence,
	sn = 0,
	sp = 0,
	len = intervals.length;

    /* take combinations of 1 item of evidence, 2 items of evidence, ..., n items of evidence */
    for (var i = 1; i < len; i++) {
	var combinations = generateCombinations(intervals, i);

	combinations.forEach(function(c){
	    sn += signTimesDependence * Math.min(c.map(getSn));
	    /* 
	     NOTE: This is presented as being min for Sp, but that is when there is an interval dependence [Pl, Pu]. Here we only have a single value for dependence, so this may no longer be true.
	     */
	    sp += signTimesDependence * Math.min(c.map(getSp));
	});
	
	/* alternate the sign, because each time we either overcount or undercount and we are correcting for that. */
	signTimesDependence *= -1;
    }

};
