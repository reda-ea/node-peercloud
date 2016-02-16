
var Args = require('args-js');
var _ = require('lodash');

exports.middleware = function(app) {
    setInterval(function() {
        if(app.peers.length)
            app.check();
    }, 1000);
    return function(req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            id: app.id,
            listening: !!app.port,
            joined: !!app.peers.length
        }));
    };
};

exports.method = function(peer, cb) {
    var self = this;
    var args = Args([
        {peer: Args.OBJECT | Args.Optional, _default: _.sample(self.peers)},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    peer = args.peer, cb = args.cb;

    peer.send('status', function(err, body) {
        if(err || body.id != peer.id) {
            self.peers = self.peers.filter(function(p) {
                return p.id != peer.id;
            });
            self.broadcast('left', {
                id: peer.id
            }, function(err, results) {
                cb(null, {
                    id: peer.id,
                    online: false
                });
            });
        }
        cb(null, _.assign(body, {
            online: true
        }));
    });
};
