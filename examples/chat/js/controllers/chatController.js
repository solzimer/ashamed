angular.module("chat").
controller("ChatController",function($scope,ashamedService){
	var MAX = 20;											// Max buffer of messages
	var PATH = "/app/chat/channels/";	// Shared memory path
	var shm = ashamedService;					// Ashamed client

	$scope.chatName = "";	// Chat name
	$scope.nickName = "";	// Nickname
	$scope.message = "";	// Current message
	$scope.chat = null;		// Reference to chat object

	/**
	 * Creates a new chat room
	 */
	function newChat(name) {
		return {
			lastModified : new Date(),
			name : name,
			history : []
		}
	}

	/**
	 * Initializes the application
	 */
	function init() {
		// Watch for the array 'chat.history' modification under angular
		$scope.$watchCollection("chat.history",function(newVal){
			// If has been modified, update the shared memory
			if(newVal && newVal.length) {
				var path = PATH+$scope.chatName;
				shm.update(path,$scope.chat);
			}
		});
	}

	/**
	 * Joins to a new chat room
	 */
	$scope.join = function() {
		// Default nickName if not provided
		$scope.nickName = $scope.nickName || "anonymous";

		// Path of the chat room under the app shared memory
		var path = PATH+$scope.chatName;

		// Try to get the chat room if it already exists
		shm.get(path,{create:true}).then(function(chat) {
			// Return the reference, or create a new one if doesn't exist
			return chat || shm.set(path,newChat($scope.chatName));
		}).then(function(chat){
			// Gets a reference to the chat room
			$scope.chat = chat;
		});
	}

	/**
	 * Pos a new message to the chat
	 */
	$scope.add = function() {
		// Adds a new line to the chat history
		$scope.chat.history.push({
			nickName:$scope.nickName,
			message:$scope.message.trim()
		});

		// Caps the history to the MAX size
		while($scope.chat.history.length>MAX) {
			$scope.chat.history.shift();
		}

		// Resets message input
		$scope.message = "";
	}

	init();
});
