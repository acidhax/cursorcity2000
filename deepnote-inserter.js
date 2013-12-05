(function() {
	var loadSocketIO = function (cb) {
		var socketioScript=document.createElement("script");
		socketioScript.src="http://localhost:3000/socket.io/socket.io.js";
		document.body.appendChild(socketioScript);
		if (cb) cb(socketioScript);
	};
	var loadWormhole = function (cb) {
		var script=document.createElement("script");
		script.src="http://localhost:3000/wormhole/client.js";
		document.body.appendChild(script);
		if (cb) cb(script);
	};
	var loadBusiness = function (cb) {
		var script = document.createElement("script");
		script.src="http://localhost:3002/wormhole.connect.js";
		document.body.appendChild(script);
		cb("shits ready, fuckin' right.");
	};
	var attachLoad = function (script, callback) {
		if (script.addEventListener) {
			script.addEventListener("load", callback);
		} else if (script.attachEvent) {
			script.attachEvent("onload", callback, false);
		}
	};

	loadSocketIO(function (script) {
		attachLoad(script, function () {
			loadWormhole(function (script) {
				attachLoad(script, function () {
					loadBusiness(function (heh) {
						// var script = document.createElement("script");
						// script.textContent = "window.connectWormhole();";
						// document.body.appendChild(script);
						/*var socket = io.connect('http://localhost:3002');
						var wh = new wormhole(socket);
						socket.on('connect', function () {
							wh.ready(function () {
								setTimeout(function () {
									wh.rpc.hello("test", function (word) {
										console.log("rpcResponse:", word);
									});
								}, 3000);
							});
						});*/
					});
				});
			});
		});
	});

	
}());