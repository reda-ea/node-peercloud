
var _ = require('lodash');

// handler == fn(body, cb) takes json body, outputs response body (in cb)
exports.defaultMw = function(client, handler) {
    if(typeof handler != 'function') {
        handler = client;
        client = null;
    }
    if(typeof handler != 'function')
        handler = function(body, cb) {
            cb(null, {});
        };
    return function(req, res, next) {
        if(req.method != 'POST')
            next();
        if(client && !_.find(client.peers, function(peer) {
            return peer.id == req.headers['x-peercloud-id'];
        }))
            next();
        handler(req.body || {}, function(err, resp) {
            if(err)
                return next(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(resp));
        }, req, res);
    };
};
