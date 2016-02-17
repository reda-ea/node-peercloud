# node-peercloud

peerCloud is two things:

* an HTTP based protocol for the exchange of message within a private "peer to peer cloud".
* a node.js implementation with a very simple API.

## documentation

the node module exports a function than can automatically set up a new network,
or connect to an existing one.

Here's a simple example with all of the essential features:

```javascript
var peercloud = require('peercloud');

peercloud({
    peers: [
        {ip: '127.0.0.1', port: '9338'},
        {ip: 'localhost', port: 8080},
        {ip: 'example.com', port: 4444}
    ],
    port: process.env.PORT || 0,
    data: {
        port: port,
        joined: new Date()
    },
    onmessage: function(peer, body, reply) {
        console.log('peer: ' + JSON.stringify(peer, null, 2));
        console.log('body: ' + JSON.stringify(body, null, 2));
        reply(null, {status: 'received'});
    }
}, function(err, client) {
    if(err) {
        console.error(err);
        process.exit(1);
    }
    client.send({message: 'hi all'}); // broadcast to all peers
    setInterval(function() {
        var peers = client.peers();
        console.log('got ' + peers.length + ' peers : ' + JSON.stringify(peers, null, 2));
        if(peers.length) {
            var randompeer = peers[Math.floor(Math.random()*peers.length)];
            randompeer.send({message: 'hello'});
        }
    }, 5000);
});
```
Running this code for the first timewill start a peer on the port specified
by the `PORT` environment variable, or a random one (default `9338`).

Running it for the second time (assuming the first one was running in one of
the ports from the code (9338, 8080, 4444), it will connect to the first one.

Running more instances adds more peers to the cloud.

Additinally, once connected, each peer will do the following every 5 seconds:

* dump all of the known peers it is connected to (the current cloud)
* send a message to a random peer

The system automatically handles data transport, updating network state
(propagating new / dropped nodes), so the code only focused on actually
handling messages (which are all JSON objects).

### basic usage

#### peercloud(options, callback)

the main export of the module, this function starts a new peer (automatically
joining an existing network if found).

`options` is an object with following:

* `peers`: an array of known peers, the new node will try to contact each of
  these (in random order) with a join request.
* `port`: the port the current peer will be listening on, or `0` for random.
  * If port is `0` or not specified, port `9338` will be tried, then a random
    available port (if 9338 is already used).
  * If a specified port (non zero) is not available, the operation will fail.
* `data`: any JSON data object identifying the individual peer (doesn't have
  to be unique), will be available to all other peers.
* `onmessage(peer, body, reply)`: the main message handler, called everytime
  another peer send a message. accepts the following arguments:
  * `peer`: data of the message sender (the `data` argument above).
  * `body`: the message contents, a JSON object.
  * `reply(err, body)`: a node.js style callback to send the reply (JSON) back.

`callback(err, client)` is a node.js style callback for the peer startup:

* `err`: the error if any, `null` otherwise.
* `client`: a client (actually a proxy) for network, allowing all actual
  operations, details below.

#### client.send(body, callback)

Broadcasts a message to all peers in the cloud, and aggregates replies.

* `body`: the JSON message to send.
* `callback(err, replies)`: called once all message operations are done.
  The results of the operations are provided in `err` if there has been
  at least one error, or `replies` if there are no errors.
  The results object is an array of objects with the following properties:
  * `peer`: the data of the peer that sent the reply.
  * `error`: the data of the error, if any.
  * `value`: the response body (JSON), if there was no error.

Note that errors in this context mean errors communicating with peers, or with
the general functioning of the underlying cloud network (eg. timeout on reply).
Application level errors (eg. web service error reply) will usually be provided
as valid responses, their internal formatting indicating the error.

#### client.peers()

Returns (synchronously) an array of all the current peers in the network.

Each peer object (actually a proxy) has the following:

* `data`: the data object for the peer (as described above).
* `send(body, callback)`: sends an individual message, details below.

#### peer.send(body, callback)

Sends an individual message to a peer in the cloud. The message will be handled
by the peer's `onmessage` handler (described above), and the reply (er error)
provided to the callback.

* `body`: the JSON body of the message to send (object).
* `callback(err, reply)`: a node.js style callback with the reply JSON object
  as `reply`, or an error in `err`.

#### client.close()

Properly leaves the cloud, notifying all other peers before stopping listeners.

Not actually needed, as by default the network regularly checks its nodes and
will automatically fix itself once a peer leaves. But can avoid some unnecessary
traffic in very high usage / number of peers.

#### Events

In addition to the above, the implementation will also provide events for all
important operations (joined cloud, new peer, peer left, message sent, etc).

_This feature is still under development_

### advanced usage

As specified above, the `client` and `peer` objects are actually proxies to the
actual client and peer objects, providing a subset of the functionality with
additional safety.

The `peercloud()` main function actually returns that full client object,
which itself gives access to the actual peer objects in its `.peers` array.

_Detailed documentation for these elements is coming later_

### protocol

The peercloud protocol is actually very simple, at its base a peer is a simple
HTTP server, and all network operations are HTTP transactions:

* all communication is made using `POST` requests.
* all messages are JSON encoded (`application/json` content type).
* with the exception of the `join` and `check` methods, all requests have the
  `x-peercloud-id` header, with a unique id for the sender, and only messages
  from a known id are allowed (behavior undefined otherwise).
* all valid responses must have the status code `200`, behavior for any other
  HTTP status code is undefined (default client considers non 2xx a failure).
* clients are not expected to follow redirects (although default one does).

The following endpoints are available for each peer:

#### /join

Request to join the cloud that the peer is a member of.

Accepts as input a JSON object with the following:

* `id`: The unique id of the joining peer (client). Each peer has a unique id
  that identifies them in the cloud, all future communication (once a member of
  the cloud) must be tagged with it. If not provided, one must be generated and
  sent back to the client.
* `ip`: The preferred ip address for the peer, usually not provided as it can
  be more easily inferred by the server. Must be checked before the join is
  considered successful (see `/check` below).
* `port`: The port where the client is listening, very recommended. If not
  provided, the default port `9338` is assumed (and checked as well).
* `data`: the data object identifying the client peer, defaults to `{}`.

Once all information is verified, the server must check the client by contacting
its `/check` endpoint.

Once the check is successful, the server must inform all other peers in the
cloud, using the `/joined` endpoint below.

The sever must then reply to the client with a list of all peers, including
itself, the message is a JSON object with the following format:

* `status`: must have the value `joined` if successful, any other value
  indicates failure, and the client should not be considered a member.
* `id`: the same `id` from the request if provided, or the generated one if not.
* `ip` _(optional)_: the inferred, or provided IP address of the client peer.
* `port` _(optional)_: the inferred, or provided port of the client peer.
* `self`: information about the server, has the following format:
  * `id`: ine internal peer id of the server.
  * `data`: the identifying data object of the server.
* `peers`: an array of JSON objects describing each of the other peers:
  * `id`: the internal id of the peer.
  * `ip`: the IP address of the peer.
  * `port`: the port where the peer is listening.
  * `data`: the identifying data of the peer.

Note that information about the server itself is provided separately, as it has
a different format than the other peers.

While it can be difficult for the server to know its own ip address for example,
the client already knows it (the client issued the HTTP call to the ip/port).

Once the client received the reply, it must add all peers to its internal list,
including the server.

If necessary, the client must also save the provided `id`, as it will be needed
for all future messages (in the `x-peercloud-id` request header).

#### /joined

Used to notify a peer (server), that another peer has joined the cloud.

Accepts a JSON object describing the new peer:

* `id`: the internal id of the peer.
* `ip`: the IP address of the peer.
* `port`: the port where the peer is listening.
* `data`: the identifying data of the peer.

Whenever a member of the cloud accepts a new peer, information about it must be
sent to all other peers using this endpoint.

The server must then add this information to its internal list of peers, and
then reply with an acknowledgement JSON:

* `status`: must be `added` for success, any other value indicates failure.

#### /left

Used to notify a peer (server), that another peer has left the cloud.

Accepts a JSON object with a single value:

* `id`: the internal id of the peer.

Can be used either by an exiting peer before leaving the cloud and shutting
down, or by any peer that detects that another one stopped responding.

After receiving this message, the server must remove the peer from its internal
list, and then reply with an acknowledgement JSON:

* `status`: must be `removed` for success, any other value indicates failure.

#### /status

Returns status information about the peer, mostly used as a "ping" to see if a
peer is responding, but can also provide information about it.

A server MUST use this to check a joining client before adding it to the cloud.

This method requires no input, and does not require the `x-peercloud-id` header.
It replies to the sender with a JSON status object:

* `id`: the internal id of the peer. MUST be provided if available only
  (eg. optional on the check before joining a cloud, as it may not exist yet).
* `online` (optional): SHOULD always be set to `true` or a truthy value.
  A falsy value means the peer can be assumed offline (eg. currently shutting
  down), but clients are not expected to handle it.
* `listening` (optional): SHOULD always be `true` (server currently listening).
* `joined` (optional): `true` if part of a cloud, `false` otherwise.

When checking a peer, if the returned `id` is different than the one on the
internal list, the client is expected to remove the server from its list, and
send a `/left` broadcast to other peers.

Other properties are mandatory on the server side, and clients are not expected
to handle them even when they are provided.

#### /message

Used to send random messages between peers. This is the function exported by
the proxy `client.send()` and `peer.send()` methods (see basic usage above).

Accepts any JSON object, the server is expected to handle it and send a JSON
object as a response (eg. `{}` for an empty response).

The default implementation will handle non `4xx` and `5xx` responses as errors,
and will provide their payload to the application, but that is not a requirement
for clients, so application level errors should be provided as `2xx` responses,
with the message format indicating the error.

## TODO

in no particular order:

* events
* complete documentation
  * advanced usage
  * events
* detailed logging
* security
  * malicious / erroneous code
  * authentication (private clouds)
* peer data update