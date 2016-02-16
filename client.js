
var _ = require('lodash');
var connect = require('connect');
var uuid = require('uuid');
var http = require('http');
var Args = require('args-js');
var bodyParser = require('body-parser-json');

var $Peer = require('./peer');
var $join = require('./join');
var $joined = require('./joined');
var $leave = require('./leave');
var $check = require('./check');
var $message = require('./message');

const DEFAULTPORT = 9338;

var Client = function(options) {
    var args = Args([
        {options: Args.OBJECT | Args.Optional, _default: {}}
    ], arguments);
    var app = connect();
    _.extend(app, Client.prototype);
    app.id = uuid.v4();
    app.options = args.options;
    app.peers = [];
    app.use(bodyParser.json());
    app.use('/join', $join.middleware(app));
    app.use('/joined', $joined.middleware(app));
    app.use('/left', $leave.middleware(app));
    app.use('/status', $check.middleware(app));
    app.use('/message', $message.middleware(app));
    return app;
};

Client.prototype.listen = function(options, cb) {
    var self = this;
    var args = Args([
        {options: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    options = args.options; cb = args.cb;
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

Client.prototype.join = $join.method;
Client.prototype.leave = $leave.method;
Client.prototype.check = $check.method;
Client.prototype.autoCheck = $check.auto;

Client.prototype.broadcast = function(type, json, cb) {
    var args = Args([
        {type: Args.STRING | Args.Optional, _default: 'message'},
        {json: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    type = args.type; json = args.json; cb = args.cb;
    $Peer.sendAll(this.peers, type, json, cb);
};

module.exports = Client;
