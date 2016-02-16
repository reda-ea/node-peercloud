
var _ = require('lodash');
var connect = require('connect');
var uuid = require('uuid');
var http = require('http');
var Args = require('args-js');

var $join = require('./join');

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
    app.use('/join', $join.middleware(app));
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

module.exports = Client;
