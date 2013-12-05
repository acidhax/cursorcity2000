//thisgetsinjected.js
<script>
	var socket = io.connect('www....com');
	var wh = new wormhole(socket);
	socket.on('connect', function () {
		wh.ready(function () {
			setTimeout(function () {
				wh.rpc.hello("test", function (word) {
					console.log("rpcResponse:", word);
				});
			}, 3000);
		});
	});
</script>