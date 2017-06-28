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

	shm.service("ashamedService",["ashamedConfig","$rootScope", function(config,$rootScope,){
		const client = new AshamedClient(config);

		client.on("message",msg=>{
			setTimeout(()=>$rootScope.$apply());
		});

		this.get = function(path,options) {
			return client.get(path,options);
		}

		this.set = function(path,item,options) {
			return client.set(path,item,options);
		}
}]);

})(window);
