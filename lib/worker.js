const
	cluster = require('cluster'),
	extend = require('extend'),
	DeepDiff = require('deep-diff'),
	Path = require('./path.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath;

const CHANNEL = "ashamed";
const vfn = ()=>{};

var pending = {};
var store = {};

process.on('message', handleMessage);

function handleMessage(msg) {
	if(msg.channel!=CHANNEL) return;
	if(msg.type == "model-update") {
		modelUpdate.apply(this,msg.args);
	}
	else if(msg.type == "response") {
		if(!pending[msg.cid]) return;
		var cb = pending[msg.cid];
		delete pending[msg.cid];
		cb.apply(this,msg.args);
	}
}

function send(cmd,callback) {
	cmd.cid = `${process.pid}_${Math.random()}`;
	cmd.channel = CHANNEL;
	pending[cmd.cid] = callback||vfn;
	process.send(cmd);
}

function modelUpdate(path,changes) {
	changes = changes || [];

	changes.forEach(diff=>{
		diff.path = diff.path || [];
		var newPath = strToPath(path+"/"+diff.path.join("/"));
		if(diff.kind=="N" || diff.kind=="E") {
			getPath(newPath,true,store,diff.rhs);
		}
		else if(diff.kind=="D") {
			var last = newPath.pop();
			var item = getPath(newPath,true,store);
			delete item[last];
		}
		else if(diff.kind=="A") {
			var item = getPath(newPath,true,store,diff.item.kind!="D"?[]:undefined);
			if(diff.item.kind=="D") item.pop();
			else item.push(diff.item.rhs);
		}
	});
}

var fns = {
	all() {
		return store;
	},
	set(path,item,options,callback) {
		if(typeof(options)=="function") {
			callback = options;
			options = null;
		}

		options = options || {};
		callback = callback || vfn;

		// Send command to master
		send({op:"set",args:[path,item,options]},callback);
	},
	get(path,options,callback) {
		if(typeof(options)=="function") {
			callback = options;
			options = null;
		}

		options = options || {};
		callback = callback || vfn;

		// If options.realtime, create path, so we can be subscribed
		// to changes in model
		getPath(path,options.realtime,store);

		// Send command to master
		send({op:"get",args:[path,options]},(err,data)=>{
			if(options.realtime && !err) {
				callback(null,getPath(path,true,store,data));
			}
			else {
				callback(err,data);
			}
		});
	},
	del(path,callback) {
		callback = callback || vfn;

		// Send command to master
		send({op:"del",args:[path]},callback);
	}
}

module.exports = fns;
