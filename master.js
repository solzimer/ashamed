const
	cluster = require('cluster'),
	extend = require('extend');

const CHANNEL = "ashamed";
const vfn = ()=>{};

var store = {};
var listeners = {};
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

function strToPath(path) {
	return Array.isArray(path)?
		path :
		path.replace(/ /g,"").split("/").filter(s=>s.length);
}

function pathToStr(path) {
	return path.join("/");
}

function getPath(path,create) {
	var root = store;
	path = strToPath(path);
	while(path.length) {
		let folder = path.shift();
		if(!root[folder]) {
			if(create) {
				root[folder] = {};
			}
			else {
				return null;
			}
		}
		root = root[folder];
		if(!path.length) return root;
	}
}

var fns = {
	set(path,item,ttl,callback) {
		if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
		else {ttl = parseInt(ttl) || null;}
		callback = callback || vfn;

		var root = getPath(path,true);
		extend(true,root,item);
		console.log(root);
		callback(null,item,ttl);
	},
	get(path,realtime,callback) {
		if(typeof(realtime)=="function") {callback = realtime; realtime = false;}

		var root = getPath(path);
		if(root) callback(null,root);
		else callback("Entry not found",null);
	},
	del(path,callback) {
		var root = store;
		var item = null;

		path = strToPath(path);
		var last = path.pop();
		var root = getPath(path);
		if(root) {
			var item = extend(true,{},root[last]);
			extend(root[last],{});
			delete(root[last]);
			if(item) callback(null,item);
		}
		else {
			callback("Entry not found",null);
		}
	}
}

module.exports = fns;
