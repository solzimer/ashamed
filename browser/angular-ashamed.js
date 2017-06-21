angular.module("ashamed",[]).

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
	["ashamedConfig","$rootScope","$http","$q",
	function(config,$rootScope,$http,$q){

	const CHANNEL = "ashamed";
	const extend = angular.merge;
	var opts = {realtime:config.realtime};
	var store = {}
	var url = {
		ws : "ws://"+config.host+config.base+"/ws/shm",
		http : "http://"+config.host+config.base+"/shm"
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
		path = strToPath(path || []);
		while(path.length) {
			let folder = path.shift();
			if(!root[folder]) {
				if(create) {root[folder] = {};}
				else {return null;}
			}
			if(!path.length && val)	{
				if(typeof(root[folder])=="object" && Object.keys(root[folder]).length) {
					extend(root[folder],val);
				}
				else {
					root[folder] = val;
				}
			}
			root = root[folder];
			if(!path.length) return root;
		}
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

	function handleMessage(msg) {
		msg = JSON.parse(msg.data);
		if(msg.channel!=CHANNEL) return;
		if(msg.type == "model-update") {
			modelUpdate.apply(this,msg.args);
		}
		$rootScope.$apply();
	}

	function init() {
		var ws = new WebSocket(url.ws);
		ws.onerror = (err)=>console.log(err);
		ws.onmessage = handleMessage;
	}

	this.get = function(path,options) {
		var q = $q.defer();

		options = extend({},opts,options);

		// If options.realtime, create path, so we can be subscribed
		// to changes in model
		getPath(path,options.realtime);

		$http.get(url.http+path).then(req=>{
			if(options.realtime) {
				var k = getPath(path,true,store,req.data);
				q.resolve(k);
			}
			else {
				q.resolve(req.data);
			}
		},err=>{
			q.reject(err);
		});

		return q.promise;
	}

	init();
}]);
