
var Args = require('args-js');
var _ = require('lodash');

var $message = require('./message');

exports.middleware = function(app) {
    return $message.defaultMw(function(body, cb) {
        cb(null, {
            id: app.id,
            online: true,
            listening: !!app.port,
            joined: !!app.peers.length
        });
    });
};

exports.auto = function(interval) {
    var self = this;
    if(self._autocheck) {
        clearInterval();
        delete self._autocheck;
    }
    if(!interval) return;
    if(interval === true)
        interval = 5000;
    self._autocheck = setInterval(function() {
        if(self.peers.length)
            self.check();
    }, interval);
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
