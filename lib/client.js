const
	q = require("q"),
	Path = require("./path.js"),
	extend = require("extend"),
	EventEmitter = require('events'),
	strToPath = Path.strToPath,
	pathToStr = Path.pathToStr,
	getPath = Path.getPath;

const	WebSocketClient = typeof(WebSocket)!=="undefined"?
	WebSocket : require('websocket').w3cwebsocket;

var store = {};
var pending = {};

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
	var [path, changes] = msg.args;
	changes = changes || [];

	// For each change
	changes.forEach(diff=>{
		// Real path of the change
		var newPath = (path+"/"+diff.path.join("/")).split("/");
		// If something has been added or modified
		if(diff.kind=="N" || diff.kind=="E") {
			// Apply changes
			getPath(newPath,true,store,diff.rhs);
		}
		else if(diff.kind=="D") {
			var last = newPath.pop();
			var item = getPath(newPath,true,store);
			delete item[last];
		}
		else if(diff.kind=="A") {
			item = getPath(newPath,true,store);
			if(diff.item.kind=="D") item.pop();
			else item.push(diff.item.rhs);
		}
	});
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
		var def = q.defer();
		var ws = new WebSocketClient(this._url.ws);
		ws.onerror = (err)=>this.emit("error",new Error("Unable to connect!"));
		ws.onopen = ()=>def.resolve(ws);
		ws.onmessage = (msg)=>{
			handleMessage(msg);
			this.emit("message",msg);
		}
		this._ready = def.promise;
	}

	_send(msg,callback) {
		msg.channel = CHANNEL;
		if(callback) {
			// Correlation ID to the callback
			msg.cid = `ws_${Math.random()}`;
			pending[msg.cid] = callback;
		}

		this._ready.then(ws=>{
			ws.send(JSON.stringify(msg));
		});
	}

	get(path,options) {
		var def = q.defer();
		var cid = "ws_"+Math.random();

		options = extend({},this._options,options);
		this._send({op:"get", args:[path,options]},(err,data)=> {
			if(err && err.code) {
				def.reject(err);
			}
			else if(options.realtime) {
				def.resolve(getPath(path,true,store,data));
			}
			else {
				def.resolve(data);
			}
		});

		return def.promise;
	}
}

module.exports = AshamedClient;