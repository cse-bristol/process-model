"use strict";

/*global module, require*/

var livedb = require('livedb'),
    sharejs = require('share'),
    connect = require('connect'),
    server = connect(),
    stream = require('stream'),
    browserChannel = require('browserchannel').server,
    port = 8080,

    backend = livedb.client(livedb.memory()),
    share = require('share').server.createClient({backend: backend});

server.use(
    browserChannel(
	{
	    base: "/process-model/server"
	},
	function(client) {
	    var stream = stream.Duplex({objectMode: true});

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

