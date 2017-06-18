const cluster = require('cluster');
const CHANNEL = "ashamed";
const vfn = ()=>{};

var store = {};
var workers = [];

cluster.on('online', (worker) => {
	workers.push(worker);
	worker.on("message",msg=>handleMessage(worker,msg));
});

cluster.on('disconnect', (worker) => {
	workers.splice(workers.indexOf(worker),1);
});

function handleMessage(worker, message) {
	if(message.channel!=CHANNEL) return;
	else {
		var op = message.op;
		var args = message.args;
		args.push(function(){
			var response = {
				channel:CHANNEL,
				cid:message.cid,
				type:"response",
				args:[].slice.call(arguments)
			};
			worker.send(response);
		});
		fns[op].apply(this,args);
	}
}

var fns = {
	set(path,item,ttl,callback) {
		var root = store;
		if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
		else {ttl = parseInt(ttl) || null;}
		callback = callback || vfn;

		path = path.replace(/ /g,"").split("/").filter(s=>s.length);
		while(path.length) {
			let folder = path.shift();
			if(!root[folder]) root[folder] = {};
			if(!path.length) root[folder] = item;
			else root = root[folder];
		}
		callback(null,item,ttl);
	},
	get(path,callback) {
		var root = store;

		path = path.replace(/ /g,"").split("/").filter(s=>s.length);
		while(path.length && root) {
			let folder = path.shift();
			root = root[folder];
		}

		if(root) callback(null,root);
		else callback("Entry not found",null);
	},
	del(path,callback) {
		var root = store;
		var item = null;

		path = path.replace(/ /g,"").split("/").filter(s=>s.length);
		while(path.length && root) {
			let folder = path.shift();
			root = root[folder];
			if(root && !path.length) {
				item = root[folder];
				delete root[folder];
			}
		}

		if(item) callback(null,item);
		else callback("Entry not found",null);
	}
}

module.exports = fns;
