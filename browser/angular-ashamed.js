angular.module("ashamed",["ashamed-path"]).

provider("ashamedConfig",function(){
	var self = this;
	this.host = "localhost:3000";
	this.base = "";
	this.realtime = true;

	this.$get = function() {
		return {
			host : self.host,
			base : self.base,
			realtime : self.realtime
		};
	}
}).

service("ashamedService",
	["ashamedConfig","path","$rootScope","$http","$q",
	function(config,path,$rootScope,$http,$q){

	const
		CHANNEL = "ashamed";
		extend = angular.merge,
		strToPath = path.strToPath,
		pathToStr = path.pathToStr,
		getPath = path.getPath;

	const url = {
		ws : "ws://"+config.host+config.base+"/ws",
		http : "http://"+config.host+config.base
	}

	var opts = {realtime:config.realtime};
	var store = {}
	var pending = {};
	var client = init();

	/**
	 * Sends a message to the server
	 * @param msg mixed
	 * @param callback fn
	 */
	function send(msg,callback) {
		msg.channel = CHANNEL;
		if(callback) {
			// Correlation ID to the callback
			msg.cid = `ws_${Math.random()}`;
			pending[msg.cid] = callback;
		}

		client.then(ws=>{ws.send(JSON.stringify(msg));});
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

		// Apply scope, because websocket flow runs outside angular cycle
		$rootScope.$apply();
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

	function init() {
		var q = $q.defer();
		var ws = new WebSocket(url.ws);
		ws.onerror = (err)=>console.log(err);
		ws.onmessage = handleMessage;
		ws.onopen = ()=>q.resolve(ws);
		return q.promise;
	}

	this.get = function(path,options) {
		var q = $q.defer();
		var cid = "ws_"+Math.random();

		options = extend({},opts,options);
		pending[cid] = (err,data)=> {
			if(err) {q.reject(err);	}
			else if(options.realtime) {q.resolve(getPath(path,true,store,data));}
			else {q.resolve(data);}
		}

		send({op:"get", args:[path,options]},(err,data)=> {
			if(err && err.code) {q.reject(err);	}
			else if(options.realtime) {q.resolve(getPath(path,true,store,data));}
			else {q.resolve(data);}
		});

		return q.promise;
	}
}]);
