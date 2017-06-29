/*global angular */

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the todoStorage service
 * - exposes the model to the template and provides event handlers
 */
angular.module('todomvc')
	.controller('TodoCtrl', function TodoCtrl($scope, $filter, ashamedService) {
		'use strict';

		var path = "/app/todo";
		var todos = $scope.todos || [];

		$scope.newTodo = '';
		$scope.editedTodo = null;
		$scope.saving = false;
		$scope.editing = false;

		// Initialize the storage
		function init() {
			ashamedService.get(path,{create:true}).then(function(data){
				return data || ashamedService.set(path,todos);
			}).then(function(data){
				todos = $scope.todos = data;
			}).finally(configure);
		}

		// Configure the controller, once we've got the storage
		function configure() {
			$scope.$watch('todos', function () {
				$scope.remainingCount = $filter('filter')(todos, { completed: false }).length;
				$scope.completedCount = todos.length - $scope.remainingCount;
				$scope.allChecked = !$scope.remainingCount;
				$scope.saving = true;

				// Data will be updated (only the changes)
				ashamedService.update(path,todos).finally(function(){
					$scope.saving = false;
					$scope.editing = false;
				});
			}, true);
		}

		$scope.addTodo = function () {
			var newPath = path + "/" + todos.length;
			var title = $scope.newTodo.trim();

			if (!title) {
				return;
			}
			else {
				todos.push({title:title, completed:false});
			}
		};

		$scope.editTodo = function (todo) {
			$scope.editedTodo = todo;
			$scope.originalTodo = angular.extend({}, todo);
		};

		$scope.saveEdits = function (todo) {
			// Prevents saving twice if event is fired more than one time
			if($scope.editing) return;
			else $scope.editing = true;

			// ESC key was pressed previously. Do nothing
			if ($scope.reverted) {
				$scope.reverted = false;
				$scope.editing = false;
				return;
			}

			todo.title = todo.title.trim();
		};

		$scope.revertEdits = function (todo) {
			todos[todos.indexOf(todo)] = $scope.originalTodo;
			$scope.editedTodo = null;
			$scope.originalTodo = null;
			$scope.reverted = true;
		};

		$scope.removeTodo = function (todo) {
			todos.splice(todos.indexOf(todo),1);
		};

		$scope.clearCompletedTodos = function () {
			todos.filter(function(todo){
				return todo.completed;
			}).forEach(function(todo){
				todos.splice(todos.indexOf(todo),1);
			});
		};

		$scope.markAll = function (completed) {
			todos.forEach(function (todo) {
				todo.completed = true;
			});
		};

		init();
	});
