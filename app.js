
/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  user = require('./routes/user'),
  http = require('http'),
  path = require('path'),
  fs = require('fs'),
  os = require('os'),
  socketio = require('socket.io'),
  redis = require('redis'),
  sessionSecret = process.env.sessionSecret || 'ONE TWO TIE MY SHOE THREE FOUR GET THE FUCK OUT OF MY CODE',
  sessionKey = process.env.sessionKey || 'matbee.sid',
  cookieParser = express.cookieParser(sessionSecret),
  wormholeServer,
  RedisStore,
  RedisPubSub,
  wh,
  wormholeExternalHostname = os.hostname() || "hp.discome.com";

var readClient = redis.createClient(10254, "pub-redis-10254.us-east-1-4.1.ec2.garantiadata.com");
var writeClient = redis.createClient(10254, "pub-redis-10254.us-east-1-4.1.ec2.garantiadata.com");

var subClient = redis.createClient(10254, "pub-redis-10254.us-east-1-4.1.ec2.garantiadata.com");
var pubClient = redis.createClient(10254, "pub-redis-10254.us-east-1-4.1.ec2.garantiadata.com");

var app = express();

if (fs.existsSync('../wormhole-remix')) {
  wormholeServer = require('../wormhole-remix');
} else {
  wormholeServer = require('wormhole-remix');
}

if (fs.existsSync('../connect-redis-pubsub')) {
  RedisStore = require('../connect-redis-pubsub')(express);
} else {
  RedisStore = require('connect-redis-pubsub')(express);
}

if (fs.existsSync('../redis-pub-sub')) {
  RedisPubSub = require('../redis-pub-sub');
} else {
  RedisPubSub = require('redis-sub');
}

var redisSub = new RedisPubSub({pubClient: pubClient, subClient: subClient});
var sessionStore = new RedisStore({
  prefix: process.env.sessionPrefix || 'matbeeSession:',
  pubsub: redisSub
});

wh = new wormholeServer({
  protocol: "http",
  hostname: wormholeExternalHostname,
  port: process.env.PORT || 8080,
  sessionStore: sessionStore,
  cookieParser: cookieParser,
  sessionKey: sessionKey
});

wh.addNamespace('/follow');
wh.setPath("http" + "://"+wormholeExternalHostname+":"+"80"+"/follow/connect.js");

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: sessionSecret,
    store: sessionStore,
    cookie: {
      path: '/',
      httpOnly: false,
      maxAge: process.env.sessionMaxAge?parseInt(process.env.sessionMaxAge, 10):(1000 * 60 * 60 * 24 * 60),
      domain: process.env.cookieDomain || 'hp.discome.com'
    },
    key: sessionKey
  }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

app.get('/abs', function (req, res) {
	res.sendfile('./public/abs.jpg');
});

wh.on("joinRTCChannel", function (channel) {
  this.joinRTCChannel(channel);
});

wh.on("leaveChannel", function (channel) {
  this.leaveRTCChannel(channel);
});

wh.on("battle", function (channel) {
  var self = this;
  writeClient.sadd("battle:"+channel, this.sessionId, function () {
    readClient.smembers("battle:"+channel, function (err, members) {
      if (!err && members && members.length > 0) {
        members.forEach(function (member) {
          self.rpc.userJoined(null, member);
        });
      }
    });
  });
  redisSub.publish("battle:"+channel, this.sessionId, function(){});
  redisSub.on("battle:"+channel, function (sessionId) {
    if (sessionId != self.sessionId) {
      self.rpc.userJoined(null, sessionId);
    }
  });
  redisSub.on("flee:"+channel, function (sessionId) {
    if (self.sessionId == sessionId) {
      // I'm leaving.
      writeClient.srem("battle:"+channel, self.sessionId);
    } else {
      // YOU LEAVING BRO?
      self.rpc.userLeft(null, sessionId);
    }
  });
});

wh.on("flee", function (channel) {
  redisSub.publish("flee:"+channel, this.sessionId, function(){});
});

var server = http.createServer(app);
server.listen(process.env.PORT || 8080, function(){
  console.log('Express server listening on port ' + app.get('port'));
  io = require('socket.io').listen(server);
  io.set('transports', [
    'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
    // Start up wormhole, express and Socket.IO is ready!
    io.set('log level', process.env.socketioLogLevel || 0);

    wh.start({
      io: io,
      express: app,
      report: false
    }, function (err) {
      wh.on("connection", function (traveller) {
      });
    });
});