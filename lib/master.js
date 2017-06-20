const
	cluster = require('cluster'),
	extend = require('extend'),
	DeepDiff = require('deep-diff'),
	diff = DeepDiff.diff;

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

function notify(path,changes) {
	path = pathToStr(strToPath(path));
	changes = changes || [];
	workers.forEach(w=>{
		w.send({
			channel:CHANNEL,
			type:"model-update",
			args:[path,changes]
		});
	});
}

function strToPath(path) {
	return Array.isArray(path)?
		path :
		path.replace(/ /g,"").split("/").filter(s=>s.length);
}

function pathToStr(path) {
	return typeof(path)=="string"? path : path.join("/");
}

function getPath(path,create,src,val) {
	var root = src || store;
	path = strToPath(path);
	while(path.length) {
		let folder = path.shift();
		if(!root[folder]) {
			if(create) {root[folder] = {};}
			else {return null;}
		}
		if(!path.length && val)	{
			if(typeof(root[folder])=="object" && Object.keys(root[folder]).length)
				extend(true,root[folder],val);
			else
				root[folder] = val;
		}
		root = root[folder];
		if(!path.length) return root;
	}
}

var fns = {
	all() {
		return store;
	},
	set(path,item,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}
		else {}

		callback = callback || vfn;

		var root = getPath(path,true);
		notify(path,diff(root,item));
		getPath(path,true,store,item);
		callback(null,item);
	},
	get(path,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}

		var root = getPath(path);

		if(root) callback(null,root,false);
		else callback("Entry not found",null,false);
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