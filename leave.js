
var Args = require('args-js');
var _ = require('lodash');

var $message = require('./message');

exports.middleware = function(app) {
    return $message.defaultMw(app, function(body, cb) {
        app.peers = app.peers.filter(function(peer) {
            return peer.id != body.id;
        });
        cb(null, {
            status: 'removed'
        });
    });
};

exports.method = function(cb) {
    var args = Args([
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    cb = args.cb;

    this.peers = [];
    this.broadcast('left', {
        id: this.id
    }, cb);
};
