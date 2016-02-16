
var Args = require('args-js');
var _ = require('lodash');

var $Peer = require('./peer');

exports.middleware = function(app) {
    return function(req, res, next) {
        app.peers.push(new $Peer(app, req.body));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'added'
        }));
    };
};

exports.method = function(peer, cb) {
    var args = Args([
        {peer: Args.OBJECT | Args.Required},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    var newpeer = args.peer; cb = args.cb;

    this.broadcast('joined', newpeer, cb);
};
