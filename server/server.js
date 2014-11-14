"use strict";

/*global module, require, process*/

var sharejs = require('share'),
    livedb = sharejs.db,
    connect = require('connect'),
    server = connect(),
    Duplex = require('stream').Duplex,
    browserChannel = require('browserchannel').server,
    backend = livedb.client(livedb.memory()),
    share = require('share').server.createClient({backend: backend}),
    port = function() {
	if (process.argv.length === 1) {
	    return process.argv[0];
	} else {
	    return 8080;
	}
    }();

server.use(
    browserChannel(
	function(client) {
	    var stream = new Duplex({objectMode: true});

	    stream._read = function() {};
	    stream._write = function(chunk, encoding, callback) {
		if (client.state !== 'closed') {
		    client.send(chunk);
		}
		callback();
	    };

	    client.on('message', function(data) {
		stream.push(data);
	    });

	    client.on('close', function(reason) {
		stream.push(null);
		stream.emit('close');
	    });

	    stream.on('end', function() {
		client.close();
	    });

	    return share.listen(stream);
	}));

server.listen(port);

