
var _ = require('lodash');
var Args = require('args-js');
var request = require('request');
var async = require('async');

var Peer = function(client, data) {
    _.assign(this, data);
    this.clientId = function() {
        return client.id;
    };
    this.check = function(cb) {
        if(typeof cb != 'function')
            cb = _.noop;
        client.check(this, cb);
    };
};

Peer.prototype.send = function(type, json, cb) {
    var self = this;
    var args = Args([
        {type: Args.STRING | Args.Optional, _default: 'message'},
        {json: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    type = args.type; json = args.json; cb = args.cb;

    request({
        method: 'POST',
        json: true,
        timeout: 1000,
        headers: {
            'x-peercloud-id': self.clientId()
        },
        url: require('url').format({
            protocol: 'http',
            hostname: self.ip,
            port: self.port,
            pathname: type
        }),
        body: json
    }, function(err, res, body) {
        if(err)
            return cb(err);
        if(_.toString(res.statusCode)[0] != '2')
            return cb({
                statusCode: res.statusCode,
                body: body
            });
        cb(null, body);
    });
};

// calls send on a list of peers (eg broadcast same message)
// cb(err, values) is called with results in:
// * err if there's at least one error
// * values if all calls succeeded
Peer.sendAll = function(peers, type, json, cb) {
    var args = Args([
        {peers: Args.ARRAY | Args.Required},
        {type: Args.STRING | Args.Optional, _default: 'message'},
        {json: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    peers = args.peers; type = args.type; json = args.json; cb = args.cb;

    async.map(peers, function(peer, cb) {
        peer.send(type, json, function(err, body) {
            var result = {peer: peer.data};
            if(err)
                result.error = err;
            else
                result.value = body;
            cb(null, result);
        });
    }, function(err, results) {
        if(_.find(results, function(res) {
            return res.error;
        }))
            return cb(results);
        cb(null, results);
    });
};

module.exports = Peer;
