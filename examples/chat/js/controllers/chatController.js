angular.module("chat").
controller("ChatController",function($scope,ashamedService){
	var MAX = 100;
	var PATH = "/app/chat/channels/";
	var shm = ashamedService;

	$scope.chatName = "";
	$scope.nickName = "";
	$scope.message = "";
	$scope.chat = null;

	function newChat(name) {
		return {
			lastModified : new Date(),
			name : name,
			history : []
		}
	}

	function init() {
		$scope.$watchCollection("chat.history",function(newVal){
			if(newVal && newVal.length) {
				var path = PATH+$scope.chatName;
				shm.update(path,$scope.chat);
			}
		});
	}

	$scope.join = function() {
		var path = PATH+$scope.chatName;
		shm.get(path,{create:true}).then(function(chat) {
			return chat || shm.set(path,newChat($scope.chatName));
		}).then(function(chat){
			$scope.chat = chat;
		});
	}

	$scope.add = function() {
		$scope.chat.history.push({
			nickName:$scope.nickName||"anonymous",
			message:$scope.message.trim()
		});
		while($scope.chat.history.length>MAX) {
			$scope.chat.history.shift();
		}
		$scope.message = "";
	}

	init();
});
