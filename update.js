
var Args = require('args-js');
var _ = require('lodash');

var $message = require('./message');

exports.middleware = function(app) {
    return $message.defaultMw(app, function(body, cb) {
        var peer = _.find(app.peers, function(peer) {
            return peer.id == body.id;
        });
        peer.data = body.data || {};
        cb(null, {
            status: 'updated'
        });
    });
};

exports.method = function(data, cb) {
    var args = Args([
        {data: Args.OBJECT | Args.Required},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    data = args.data; cb = args.cb;
    this.broadcast('update', {
        id: this.id,
        data: data
    }, function(err, res) {
        if(err)
            return cb(err);
        cb(null, data);
    });
};
