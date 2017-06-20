const	cluster = require('cluster');

const CHANNEL = "ashamed";
const vfn = ()=>{};

var pending = {};
var ws = null;

process.on('message', handleMessage);

function handleMessage(msg) {
	if(!ws) return;
	if(msg.channel!=CHANNEL) return;
	if(msg.type=="model-update") {
		ws.send(JSON.stringify(msg));
	}
	else {
		if(!pending[msg.cid]) return;
		var cb = pending[msg.cid];
		delete pending[msg.cid];
		cb(msg);
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

module.exports = function(websocket) {
	ws = websocket;
	ws.on("message",msg=>{
		var req = JSON.parse(msg);
		send(req,(res) => {
			console.log(res);
			ws.send(JSON.stringify({
				cid : msg.cid,
				type : res.type,
				channel : CHANNEL,
				args : res.args
			}));
		});
	});

	ws.on("close",()=>{
		ws = null;
		console.log("Close");
	});
}
