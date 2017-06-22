const
	cluster = require('cluster'),
	Path = require('./path.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath;

const CHANNEL = "ashamed";
const vfn = ()=>{};

function wshandle(ws) {
	var pending = {};
	var store = {};

	process.on('message', handleMessage);

	function handleMessage(msg) {
		if(!ws) return;
		if(msg.channel!=CHANNEL) return;
		if(msg.type=="model-update") {
			modelUpdate.apply(this,msg.args);
		}
		else {
			if(!pending[msg.cid]) return;
			var cb = pending[msg.cid];
			delete pending[msg.cid];
			cb(msg);
		}
	}

	function modelUpdate(path,changes) {
		changes = changes || [];
		changes = changes.filter(diff=>getPath(path,false,store));
		if(changes.length) {
			ws.send(JSON.stringify({
				channel : CHANNEL,
				type : "model-update",
				args : [path,changes]
			}));
		}
	}

	function send(msg,callback) {
		var cmd = {
			cid : `${process.pid}_${Date.now()}_${Math.random()}`,
			channel : CHANNEL,
			op : msg.op,
			args : msg.args
		}
		pending[cmd.cid] = callback || vfn;
		process.send(cmd);
	}

	return {
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

	websocket.on("close",()=>{fn = null;});
}
