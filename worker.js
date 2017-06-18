const cluster = require('cluster');
const CHANNEL = "ashamed";
const vfn = ()=>{};

var pending = {};

process.on('message', handleMessage);

function handleMessage(msg) {
	if(msg.channel!=CHANNEL) return;
	if(!pending[msg.cid]) return;
	var cb = pending[msg.cid];
	delete pending[msg.cid];
	cb.apply(this,msg.args);
}

function send(cmd,callback) {
	cmd.cid = `${process.pid}_${Math.random()}`;
	cmd.channel = CHANNEL;
	pending[cmd.cid] = callback||vfn;
	process.send(cmd);
}

var fns = {
	set(key,item,ttl,callback) {
		if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
		else {ttl = parseInt(ttl) || null;}
		callback = callback || vfn;

		send({op:"set",args:[key,item,ttl]},callback);
	},
	get(path,callback) {
		send({op:"get",args:[path]},callback);
	},
	del(path,callback) {
		send({op:"del",args:[path]},callback);
	}
}

module.exports = fns;
