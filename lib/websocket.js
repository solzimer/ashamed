const
	cluster = require('cluster'),
	Path = require('./path.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath;

const CHANNEL = "ashamed";
const vfn = ()=>{};

/**
 * WebSocket handler that communicates client with master process
 */
function wshandle(ws) {
	var pending = {};	// Pending callbacks
	var store = {};		// Store

	function connect() {
		process.on('message', handleMessage);
	}

	function disconnect() {
		process.removeListener('message', handleMessage);
	}

	/**
	 * Handles messages received from master process
	 * @param msg Master message
	 */
	function handleMessage(msg) {
		// If doesn't exist websocket or channel is incorrect, do nothing
		if(!ws) return;
		if(msg.channel!=CHANNEL) return;

		// Model update from external sources
		if(msg.type=="model-update") {
			modelUpdate.apply(this,msg.args);
		}
		// Generic response, passed to pending callback
		else {
			if(!pending[msg.cid]) return;
			var cb = pending[msg.cid];
			delete pending[msg.cid];
			cb(msg);
		}
	}

	/**
	 * Updates the subscribed model
	 * @param path Base path to modified object
	 * @param changes Diff from the object previous state
	 */
	function modelUpdate(path,changes) {
		// Filter only subscribed object (its base path)
		changes = changes || [];
		changes = changes.filter(diff=>getPath(path,false,store));
		// Sends to client only the changes that applies to its
		// subscribed objects
		if(changes.length) {
			ws.send(JSON.stringify({
				channel : CHANNEL,
				type : "model-update",
				args : [path,changes]
			}));
		}
	}

	/**
	 * Sends a message to the master process
	 * @param msg The operation to perform
	 * @callback Callback function to a master response
	 */
	function send(msg,callback) {
		// Command to send to master, with correlation ID to the callback
		var cmd = {
			cid : `${process.pid}_${Date.now()}_${Math.random()}`,
			channel : CHANNEL,
			op : msg.op,
			args : msg.args
		}
		pending[cmd.cid] = callback || vfn;
		process.send(cmd);
	}

	/**
	 * API to shared memory
	 */
	return {
		connect: connect,
		disconnect : disconnect,

		get(msg,callback) {
			var path = msg.args[0];
			var options = msg.args[1] || {};
			getPath(path,options.realtime,store);
			send(msg,callback);
		},
		set(msg,callback) {
			send(msg,callback);
		},
		del(msg,callback) {
			send(msg,callback);
		}
	}
}

module.exports = function(websocket) {
	var fn = wshandle(websocket);
	fn.connect();
	websocket.on("message",msg=>{
		var req = JSON.parse(msg);
		fn[req.op](req,(res) => {
			websocket.send(JSON.stringify({
				cid : req.cid,
				type : res.type,
				channel : CHANNEL,
				args : res.args
			}));
		});
	});

	websocket.on("close",()=>fn.disconnect());
	websocket.on("error",()=>fn.disconnect());
}
