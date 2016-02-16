
var _ = require('lodash');
var requestIp = require('request-ip');
var bodyParser = require('body-parser-json');
var uuid = require('uuid');
var Args = require('args-js');

var $Peer = require('./peer');
var $joined = require('./joined');

const DEFAULTPORT = 9338;

exports.middleware = function(app) {
    app.use(requestIp.mw());
    app.use(bodyParser.json());
    return function(req, res, next) {
        var peerData = {};
        peerData.id = req.body.id || uuid.v4();
        peerData.ip = req.body.ip || req.clientIp;
        peerData.port = req.body.port || DEFAULTPORT;
        peerData.data = req.body.data || {};
        var otherPeers = _.clone(app.peers);
        var newPeer = new $Peer(peerData);
        $joined.broadcast.call(app, newPeer);
        app.peers.push(newPeer);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'joined',
            self: {
                id: app.id,
                data: app.options.data
            },
            peers: otherPeers
        }));
    };
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
    $Peer.prototype.send.call(peers[0], 'join', {
        id: self.id,
        ip: options.ip || self.options.ip || null,
        port: self.port,
        data: _.assign({}, self.options.data, options.data)
    }, function(err, body) {
        if(err || body.status != 'joined')
            return self.join(peers.slice(1), options, cb);
        self.peers = body.peers.map(function(peerData) {
            return new $Peer(peerData);
        });
        self.peers.push(new $Peer({
            id: body.self.id,
            ip: peers[0].ip,
            port: peers[0].port,
            data: body.self.data
        }));
        cb(null);
    });
};

