
var Args = require('args-js');
var _ = require('lodash');

exports.middleware = function(app) {
    return function(req, res, next) {
        app.peers = app.peers.filter(function(peer) {
            return peer.id != req.body.id;
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'removed'
        }));
    };
};

exports.method = function(cb) {
    var args = Args([
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    cb = args.cb;

    this.broadcast('left', {
        id: this.id
    }, cb);
};
