
var _ = require('lodash');
var requestIp = require('request-ip');
var uuid = require('uuid');
var Args = require('args-js');

var $Peer = require('./peer');
var $joined = require('./joined');
var $message = require('./message');

const DEFAULTPORT = 9338;

exports.middleware = function(app) {
    app.use(requestIp.mw());
    return $message.defaultMw(function(body, cb, req) {
        if(app.id == body.id || _.find(app.peers, function(peer) {
            return peer.id == body.id;
        }))
            return cb({code: 'KNOWNPEERID'});
        var otherPeers = _.clone(app.peers);
        var newPeer = new $Peer(app, {
            id: body.id || uuid.v4(),
            ip: body.ip || req.clientIp,
            port: body.port || DEFAULTPORT,
            data: body.data || {}
        });
        newPeer.send('status', function(err, body) {
            if(err)
                return cb(err);
            if(body.id != newPeer.id)
                return cb({code: 'WRONGPEERID'});
            $joined.method.call(app, newPeer);
            app.peers.push(newPeer);
            cb(null, {
                status: 'joined',
                id: newPeer.id,
                ip: newPeer.ip,
                port: newPeer.port,
                self: {
                    id: app.id,
                    data: app.options.data
                },
                peers: otherPeers
            });
        });
    });
};

exports.method = function(peers, options, cb) {
    var self = this;
    var args = Args([
        {peers: Args.ARRAY | Args.Required},
        {options: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    peers = args.peers; options = args.options; cb = args.cb;
    if(!peers.length)
        return cb({code: 'NOPEERSFOUND'});
    new $Peer(self, peers[0]).send('join', {
        id: self.id,
        ip: options.ip || self.options.ip || null,
        port: self.port,
        data: _.assign({}, self.options.data, options.data)
    }, function(err, body) {
        if(err || body.status != 'joined')
            return self.join(peers.slice(1), options, cb);
        if(body.id)
            self.id = body.id;
        self.peers = body.peers.map(function(peerData) {
            return new $Peer(self, peerData);
        });
        self.peers.push(new $Peer(self, {
            id: body.self.id,
            ip: peers[0].ip,
            port: peers[0].port,
            data: body.self.data
        }));
        cb(null);
    });
};

