const
	q = require("q"),
	Path = require("./path.js"),
	extend = require("extend"),
	EventEmitter = require('events'),
	diff = Path.diff,
	applyChanges = Path.applyChanges,
	applyDiff = Path.applyDiff,
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath;

const	WebSocketClient = typeof(WebSocket)!=="undefined"?
	WebSocket : require('websocket').w3cwebsocket;

var store = {}, backup = {};
var pending = {};

const vfn = ()=>{};
const CHANNEL = "ashamed";
const DEF_OPTS = {
	host : "localhost:3000",
	base : "",
	realtime : true
}

/**
 * Handles the websocket responses
 * @param msg Websocket message
 */
function handleMessage(msg) {
	msg = JSON.parse(msg.data);
	// If channel is incorrect, do nothing
	if(msg.channel!=CHANNEL) return;
	if(msg.type == "model-update") {modelUpdate(msg);}
	else if(msg.type == "response") {modelResponse(msg);}
}

/**
 * Updates the subscribed model with external changes
 * @param msg Websocket message data
 */
function modelUpdate(msg) {
	var path = msg.args[0];
	var changes = msg.args[1]||[];
	//var bch = JSON.parse(JSON.stringify(changes));
	path = strToPath(path);

	// Apply all changes
	applyChanges(backup,changes,path);
	var patch = diff(store,backup);
	applyChanges(store,patch);
}

function modelResponse(msg) {
	var cid = msg.cid;
	var [err,data] = msg.args;

	if(!pending[cid]) return;
	else {
		var cb = pending[cid];
		delete pending[cid];
		cb(err,data);
	}
}

class AshamedClient extends EventEmitter {
	constructor(options) {
		super();

		options = extend({},DEF_OPTS,options);
		this._options = options;
		this._host = options.host;
		this._base = options.base;
		this._realtime = options.realtime;
		this._url = {
			ws : "ws://"+options.host+options.base+"/ws",
			http : "http://"+options.host+options.base
		}
		this._err = null;
		this.connect();
	}

	_send(msg,callback) {
		var err = this._err;
		msg.channel = CHANNEL;
		callback = callback || vfn;

		// Correlation ID to the callback
		msg.cid = `ws_${Math.random()}`;
		pending[msg.cid] = callback;

		if(!err) {
			this._ready.then(ws=>{
				ws.send(JSON.stringify(msg));
			},err=>{
				err.code = "ERROR";
				callback(err,null);
			});
		}
		else {
			err.code = "ERROR";
			callback(err,null);
		}
	}

	get store() {
		return store;
	}

	connect() {
		var def = q.defer();
		var ws = new WebSocketClient(this._url.ws);
		ws.onerror = (err)=>{
			this._err = `Unable to connect to ${this._url.ws}`;
			this.emit("error",this._err);
			def.reject(this._err);
		}
		ws.onopen = ()=>{
			this._err = null;
			this.emit("ready",this);
			def.resolve(ws);
		}
		ws.onmessage = (msg)=>{
			handleMessage(msg);
			this.emit("message",msg);
		}
		ws.onclose = ()=>{
			this.emit("close");
			this._err = new Error("Connection has been closed");
		}
		this._ready = def.promise;
	}

	get(path,options) {
		var def = q.defer();
		var cid = "ws_"+Math.random();

		options = extend({},this._options,options);
		this._send({op:"get", args:[path,options]},(err,data)=> {
			if(err && err.code) {def.reject(err);}
			else if(options.realtime && data!==null && data!==undefined) {
				applyDiff(store,data,path);
				backup = extend(true,{},store);
				def.resolve(getPath(path,false,store));
			}
			else {def.resolve(data);}
		});

		return def.promise;
	}

	set(path,item,options) {
		var def = q.defer();
		var cid = "ws_"+Math.random();

		options = extend({},this._options,options);
		this._send({op:"set", args:[path,item,options]},(err,data)=> {
			if(err && err.code) {def.reject(err);}
			else if(options.realtime) {
				applyDiff(store,data,path);
				backup = extend(true,{},store);
				def.resolve(getPath(path,false,store));
			}
			else {def.resolve(data);}
		});

		return def.promise;
	}

	update(path,item) {
		var s = store;
		var old = getPath(path,true,backup);
		var changes = diff(old,item);
		return this.diff(path,changes);
	}

	diff(path,changes) {
		var def = q.defer();
		var cid = "ws_"+Math.random();

		this._send({op:"diff", args:[path,changes]},(err,data)=> {
			if(err && err.code) {def.reject(err);}
			else {def.resolve(data);}
		});

		return def.promise;
	}

	path(base) {
		var def = q.defer();
		var cid = "ws_"+Math.random();

		this._send({op:"path", args:[base]},(err,data)=> {
			if(err && err.code) {def.reject(err);}
			else {def.resolve(data);}
		});

		return def.promise;
	}
}

module.exports = AshamedClient;
