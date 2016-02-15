
var _ = require('lodash');
var connect = require('connect');
var requestIp = require('request-ip');
var bodyParser = require('body-parser-json');
var uuid = require('uuid');
var http = require('http');
var request = require('request');

var $Peer = require('./peer');

const DEFAULTPORT = 9338;

var joinMiddleware = function(app) {
    app.use(requestIp.mw());
    app.use(bodyParser.json());
    return function(req, res, next) {
        var peerData = {};
        peerData.id = req.body.id || uuid.v4();
        peerData.ip = req.body.ip || req.clientIp;
        peerData.port = req.body.port || DEFAULTPORT;
        peerData.data = req.body.data || {};
        var otherPeers = _.clone(app.peers);
        app.peers.push(new $Peer(peerData));
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

var Client = function(options) {
    var app = connect();
    _.extend(app, Client.prototype);
    app.id = uuid.v4();
    app.options = options || {};
    app.peers = [];
    app.use('/join', joinMiddleware(app));
    return app;
};

Client.prototype.listen = function(options, cb) {
    var self = this;
    if(!options) options = {};
    var port = options.port || self.options.port || DEFAULTPORT;
    var server = http.createServer(self);
    var savePort = function(err) {
        if(err) return cb(err);
        self.port = server.address().port;
        cb(null);
    };
    server.on('error', function(err) {
        if(err.code == 'EADDRINUSE' && !options.port && !self.options.port)
            return server.listen(0);
        cb(err);
    });
    server.listen(port, savePort);
    return server;
};

Client.prototype.join = function(peers, options, cb) {
    var self = this;
    if(!peers.length)
        return cb({code: 'NOPEERSFOUND'});
    request({
        method: 'POST',
        json: true,
        timeout: 1000,
        url: 'http://' + peers[0].ip + ':' + peers[0].port + '/join',
        body: _.assign({}, self.options, options)
    }, function(err, res, body) {
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

module.exports = Client;
