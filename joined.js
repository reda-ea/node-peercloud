
var Args = require('args-js');
var _ = require('lodash');

var $Peer = require('./peer');
var $message = require('./message');

exports.middleware = function(app) {
    return $message.defaultMw(app, function(body, cb) {
        app.peers.push(new $Peer(app, body));
        cb(null, {
            status: 'added'
        });
    });
};

exports.method = function(peer, cb) {
    var args = Args([
        {peer: Args.OBJECT | Args.Required},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    var newpeer = args.peer; cb = args.cb;

    this.broadcast('joined', newpeer, cb);
};
