const
	cluster = require('cluster'),
	extend = require('extend'),
	DeepDiff = require('deep-diff'),
	Path = require('./path.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath,
	diff = DeepDiff.diff,
	applyDiff = DeepDiff.applyDiff,
	applyChange = DeepDiff.applyChange;

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

var fns = {
	all() {
		return store;
	},
	set(path,item,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}

		callback = callback || vfn;

		var root = getPath(path,true,store,Array.isArray(item)?[]:undefined);
		var ndiff = diff(root,item);
		applyDiff(root,item);
		notify(path,ndiff);
		callback(null,item);
	},
	get(path,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}

		var root = getPath(path,false,store);

		if(root) callback(null,root,false);
		else callback("Entry not found",null,false);
	},
	del(path,callback) {
		var root = store;
		var item = null;

		var rpath = strToPath(path);
		var last = rpath.pop();
		var root = getPath(rpath,false,store);
		if(root) {
			var item = extend(true,{},root[last]);
			var ndiff = diff(item,{});
			extend(root[last],{});
			delete root[last];
			notify(path,ndiff);
			if(item) callback(null,item);
		}
		else {
			callback("Entry not found",null);
		}
	},
	diff(changes,callback) {
		changes.forEach(change=>{
			applyChange(store,{},change);
		});
		notify("/",changes);
		callback();
	}
}

module.exports = fns;
