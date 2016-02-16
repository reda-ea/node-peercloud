
var Args = require('args-js');
var _ = require('lodash');

var $Peer = require('./peer');

exports.middleware = function(app) {
    return function(req, res, next) {
        app.peers.push(new $Peer(req.body));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'added'
        }));
    };
};

exports.broadcast = function(peer, cb) {
    var args = Args([
        {peer: Args.OBJECT | Args.Required},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    var newpeer = args.peer; cb = args.cb;

    var results = [];
    var peerCount = this.peers.length;
    var handleResult = function(result) {
        results.push(result);
        if(results.length == peerCount) {
            var errors = results.filter(function(r) {
                return r.error;
            });
            if(errors.length)
                return cb(errors);
            cb(null);
        }
    };

    this.peers.forEach(function(peer) {
        peer.send('joined', newpeer, function(err, body) {
            var result = {peer: peer};
            if(err || body.status != 'added')
                result.error = err || body;
            handleResult(result);
        });
    });
};
