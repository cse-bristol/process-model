"use strict";

/*global module, require, process*/

var sharejs = require('share'),
    livedb = sharejs.db,
    connect = require('connect'),
    server = connect(),
    Duplex = require('stream').Duplex,
    browserChannel = require('browserchannel').server,
    livedbmongo = require('livedb-mongo'),
    backend = livedbmongo('mongodb://localhost:27017/process-model?auto_reconnect', {safe:true}),
    share = sharejs.server.createClient({backend: livedb.client(backend)}),
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

