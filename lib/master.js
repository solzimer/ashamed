const
	cluster = require('cluster'),
	extend = require('extend'),
	Path = require('./path.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath,
	diff = Path.diff,
	applyChanges = Path.applyChanges;

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

		var back = extend(true,{},store);
		var root = getPath(path,true,back,item);
		var changes = diff({},back);

		applyChanges(store,changes);
		notify("/",changes);
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
	diff(path,changes,callback) {
		changes = changes || [];
		path = strToPath(path);
		applyChanges(store,changes,path);
		notify("/",changes);
		callback();
	},
	path(base,callback) {
		var root = getPath(base,false,store);
		if(root) callback(null,Object.keys(root));
		else callback("Path not found",null);
	}
}

module.exports = fns;
