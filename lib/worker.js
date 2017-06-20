const
	cluster = require('cluster'),
	extend = require('extend');

const CHANNEL = "ashamed";
const vfn = ()=>{};

var pending = {};
var store = {};

process.on('message', handleMessage);

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
	path = strToPath(path || []);
	while(path.length) {
		let folder = path.shift();
		if(!root[folder]) {
			if(create) {root[folder] = {};}
			else {return null;}
		}
		if(!path.length && val)	{
			if(typeof(root[folder])=="object" && Object.keys(root[folder]).length) {
				extend(true,root[folder],val);
			}
			else {
				root[folder] = val;
			}
		}
		root = root[folder];
		if(!path.length) return root;
	}
}

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
		if(diff.kind=="N" || diff.kind=="E") {
			var newPath = (path+"/"+diff.path.join("/")).split("/");
			getPath(newPath,false,store,diff.rhs);
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
		getPath(path,options.realtime);

		// Send command to master
		send({op:"get",args:[path,options]},(err,data)=>{
			if(options.realtime && !err) {
				getPath(path,true,store,data);
			}
			callback(err,data);
		});
	},
	del(path,callback) {
		callback = callback || vfn;

		// Send command to master
		send({op:"del",args:[path]},callback);
	}
}

module.exports = fns;
