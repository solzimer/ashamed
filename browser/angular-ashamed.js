(function(window){
	"use strict";

	const AshamedClient = require("../lib/client.js");
	const shm = angular.module("ashamed",[]);

	shm.provider("ashamedConfig",function(){
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
	});

	shm.service("ashamedService",["ashamedConfig","$q","$rootScope", function(config,$q,$rootScope){
		const client = new AshamedClient(config);

		client.on("message",()=>{
			var c = client;
			setTimeout(()=>{
				$rootScope.$apply();
			});
		});

		function resolve(data) {
			var q = $q.defer();
			setTimeout(()=>{
				$rootScope.$apply();
				q.resolve(data);
			});
			return q.promise;
		}

		this.get = function(path,options) {
			return client.get(path,options).then(resolve);
		}

		this.set = function(path,item,options) {
			return client.set(path,item,options).then(resolve);
		}

		this.diff = function(path,changes) {
			return client.diff(path,changes).then(resolve);
		}

		this.update = function(path,item) {
			return client.update(path,item).then(resolve);
		}
}]);

})(window);
