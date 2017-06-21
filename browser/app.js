angular.module("app",["ashamed"]).

config(["ashamedConfigProvider",function(shm){
		shm.host = "localhost:3000";
		shm.uri = "";
}]).

controller("main",["$scope","ashamedService",function($scope,shm){
	$scope.data = {"a":"b"};
	$scope.text = "";

	function init() {
		$scope.$watch("data",(newval)=>{
			$scope.text = JSON.stringify(newval,null,2);
		},true);

		shm.get("/path/to/key").then(res=>{
			$scope.data = res;
		},err=>{
			console.log(err);
		});
	}

	init();
}]);
