const
	cluster = require('cluster'),
	Path = require('./path.js'),
	UIDStore = require('./uid.js'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath,
	diff = Path.diff,
	applyChanges = Path.applyChanges;

const CHANNEL = "ashamed";
const vfn = ()=>{};

var uid = new UIDStore("shm_master");
var store = {};
var listeners = {};
var workers = [];
var hlist = [], hmap = {};

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
	all(callback) {
		callback = callback || vfn;
		callback(null,store);
	},
	set(path,item,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}
		callback = callback || vfn;

		// Generate a new patch (will override the path)
		var patch = [{op:"add",path:path,value:item,uid:uid.uid()}];

		// Apply patch and notify
		applyChanges(store,patch);
		patch.forEach(p=>uid.push(p));	// Stores the patch uid in history
		notify("/",patch);
		callback(null,item);
	},
	get(path,options,callback) {
		if(typeof(options)=="function") {callback = options; options = {};}
		callback = callback || vfn;

		// Gets the item under the path
		var root = getPath(path,false,store);

		// Returns the item
		if(root) callback(null,root,false);
		else callback("Entry not found",null,false);
	},
	del(path,callback) {
		callback = callback || vfn;

		// Generate delete patch and gets the deleted item
		var changes = [{op:"remove",path:path,uid:uid.uid()}];
		var item = getPath(path,false,store);

		// Apply patch and notify
		applyChanges(store,changes);
		patch.forEach(p=>uid.push(p));	// Stores the patch uid in history
		notify(path,changes);
		if(item) callback(null,item);
		else callback("Entry not found",null);
	},
	diff(path,changes,callback) {
		callback = callback || vfn;
		changes = changes || [];

		// Remove patches with an already seen UID, because
		// we have already applied them
		changes = changes.filter(p=>!uid.contains(p));
		applyChanges(store,changes,path);
		changes.forEach(p=>uid.push(p));
		notify(path||"/",changes);
		callback(null,changes);
	},
	path(base,callback) {
		var root = getPath(base,false,store);
		if(root) callback(null,Object.keys(root));
		else callback("Path not found",null);
	}
}

module.exports = fns;
