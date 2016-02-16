
var _ = require('lodash');
var Args = require('args-js');
var request = require('request');

var Peer = function(data) {
    _.assign(this, data);
};

Peer.prototype.send = function(type, json, cb) {
    var self = this;
    var args = Args([
        {type: Args.STRING | Args.Required},
        {json: Args.OBJECT | Args.Optional, _default: {}},
        {cb: Args.FUNCTION | Args.Optional, _default: _.noop}
    ], arguments);
    type = args.type; json = args.json; cb = args.cb;

    request({
        method: 'POST',
        json: true,
        timeout: 1000,
        url: require('url').format({
            protocol: 'http',
            hostname: self.ip,
            port: self.port,
            pathname: type
        }),
        body: json
    }, function(err, res, body) {
        if(err)
            return cb(err);
        if(_.toString(res.statusCode)[0] != '2')
            return cb({
                statusCode: res.statusCode,
                body: body
            });
        cb(null, body);
    });
};

module.exports = Peer;
