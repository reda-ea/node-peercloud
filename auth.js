
var NodeRSA = require('node-rsa');

// key: own private key, accepted: accepted public keys
var Auth = function(key, accepted) {
    this.key = new NodeRSA(key);
    if(!this.key.isPrivate())
        throw new Error('Non private key provided');
    if(!accepted)
        accepted = [];
    this.accepted = accepted.map(function(k) {
        return new NodeRSA(k);
    });
    this.timediff = 60000; // 1 min
};

// NOTE modifies the provided request object
Auth.prototype.sign = function(request) {
    if(!request.headers)
        request.headers = {};
    var timestamp = '' + new Date().getTime();
    request.headers['x-peercloud-timestamp'] = timestamp;
    request.headers['x-peercloud-signature'] = this.key.sign(timestamp, 'base64');
    return request;
};

Auth.prototype.verify = function(request) {
    if(!request.headers)
        return false;
    if(!request.headers['x-peercloud-timestamp'])
        return false;
    if(!request.headers['x-peercloud-signature'])
        return false;
    return this.accepted.reduce(function(s, k) {
        return s || k.verify(request.headers['x-peercloud-timestamp'],
                             request.headers['x-peercloud-signature'],
                             null, 'base64');
    }, false);
};

module.exports = Auth;
