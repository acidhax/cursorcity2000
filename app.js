
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

wh.on("click", function (victim, clicker) {
  console.log("VICTIMCLICKER", victim, clicker);
  redisSub.publish("point:"+victim, 1);
  redisSub.publish("point:"+clicker, -1);
});

wh.on("battle", function (channel, myClientId) {
  myClientId = myClientId || this.socket.id
  var self = this;
  writeClient.sadd("battle:"+channel, JSON.stringify({clientId: myClientId, socketId: this.socket.id}), function () {
    readClient.smembers("battle:"+channel, function (err, members) {
      if (!err && members && members.length > 1) {
        members.forEach(function (member) {
          if (member && member != undefined) {
            try {
              member = JSON.parse(member);
              self.rpc.userJoined(null, member.clientId, member.socketId);  
            } catch (ex) {
              writeClient.srem("battle:"+channel, member);
            }
          }
        });
      } else {
        // Signal URRBODY!
        // console.log("Send out challenge signal.");
        // redisSub.publish("challenge", channel);
      }
    });
  });
  redisSub.publish("battle:"+channel, JSON.stringify({clientId: myClientId, socketId: this.socket.id}), function(){});
  var battleChannelCB = function (data) {
    data = JSON.parse(data);
    if (data.clientId != myClientId) {
      self.rpc.userJoined(null, data.clientId, data.socketId);
    }
  };
  redisSub.on("battle:"+channel, battleChannelCB);
  var challengeCB = function (url) {
    console.log("CHALLENGE!?", url);
    self.rpc.challenge(url);
  };
  redisSub.on("challenge", challengeCB);
  var fleeChannelCB = function (id) {
    if (myClientId == id) {
      // I'm leaving.
      writeClient.srem("battle:"+channel, myClientId);
      self.leaveRTCChannel(channel);
      redisSub.removeListener("flee:"+channel, fleeChannelCB);
      redisSub.removeListener("battle:"+channel, battleChannelCB);
      redisSub.removeAllListeners("point:"+myClientId);
    } else {
      // YOU LEAVING BRO?
      self.rpc.userLeft(null, id);
    }
  };
  redisSub.on("flee:"+channel, fleeChannelCB);
  var discoFunc = function () {
    redisSub.publish("flee:"+channel, myClientId, function(){});
    redisSub.removeListener("challenge", challengeCB);
    self.leaveRTCChannel(channel);
  };
  console.log("Setting up disconnect event:", channel, myClientId);
  this.once("disconnect", discoFunc);

  redisSub.on("point:"+myClientId, function (value) {
    console.log("Setting point for myClientId:", value);
    value = parseInt(value);
    self.socket.getSessionKey("points", function (err, val) {
      console.log("err", err, "val", val);
      if (!err && (!val || isNaN(val))) {
        val = 0;
      }
      val = parseInt(val);
      val = val + value;

      self.socket.setSessionKey("points", val, function (err) {
        console.log("Set session points.");
        if (self.rpc.myScore) {
          self.rpc.myScore(null, val);
        }
      });
    });
  });

  this.rpc.setupClick(myClientId);
});

wh.on("flee", function (channel, myClientId) {
  myClientId = myClientId || this.socket.id;
  redisSub.publish("flee:"+channel, myClientId, function(){});
});

wh.on("beacon", function (channel, myClientId) {
  myClientId = myClientId || this.socket.id;
  redisSub.publish("challenge", channel);
});

wh.clientMethods({
  setupClick: function (myClientId) {
    $(document).on("click", '.cursor', function (ev) {
      console.log($(this).attr("data-id"), $(this).attr("data-myClientId"), myClientId)
      wh.rpc.click($(this).attr("data-myClientId"), myClientId, 1);
    });
    $(document).on("hover", '.cursor', function() {
        $(this).css('cursor','pointer');
    });
  },
  challenge: function (url) {
    if (url != window.location.href && confirm("Want to battle on " + url + "?")) {
      window.location = url;
    }
  }
});

var server = http.createServer(app);
server.listen(process.env.PORT || 8080, function(){
  console.log('Express server listening on port ' + app.get('port'));
  io = require('socket.io').listen(server);
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