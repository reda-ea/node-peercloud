
var _ = require('lodash');

var $client = require('./client');
var $auth = require('./auth');

module.exports = function(options, cb) {
    var port = options.port || 0;
    var data = options.data || {};
    var handler = options.onMessage || options.onmessage;
    var peers = options.peers || [];
    var authopts = options.auth;

    var client = new $client({data: data, port: port});
    var proxy = {data: data};
    if(typeof handler == 'function')
        client.onMessage = function(peer, body, cb) {
            handler.call(proxy, peer.data, body, cb);
        };

    if(authopts && authopts.key)
        client.auth = new $auth(authopts.key, authopts.accepted);

    client.listen(function(err) {
        if(err)
            return cb(err);
        client.join(_.shuffle(peers), function(err) {
            if(err && err.code != 'NOPEERSFOUND')
                return cb(err);
            client.autoCheck(true);
            proxy.peers = function() {
                return client.peers.map(function(peer) {
                    var peerproxy = {data: peer.data};
                    peerproxy.send = function(data, cb) {
                        peer.send('message', data, cb);
                    };
                    return peerproxy;
                });
            };
            proxy.update = function(data, cb) {
                this.data = data;
                client.update(data, cb);
            };
            proxy.send = function(data, cb) {
                client.broadcast('message', data, cb);
            };
            proxy.close = function() {
                client.leave();
            };
            cb(null, proxy);
        });
    });

    process.on('SIGINT', function() {
        client.leave(function() {
            process.exit(0);
        });
    });

    return client;
};
