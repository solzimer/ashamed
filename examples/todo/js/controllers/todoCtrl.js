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

		function init() {
			ashamedService.get(path,{create:true}).then(function(data){
				return data || ashamedService.set(path,todos);
			}).then(function(data){
				todos = $scope.todos = data;
			}).finally(configure);
		}

		function configure() {
			$scope.$watch('todos', function () {
				$scope.remainingCount = $filter('filter')(todos, { completed: false }).length;
				$scope.completedCount = todos.length - $scope.remainingCount;
				$scope.allChecked = !$scope.remainingCount;
				$scope.saving = true;
				ashamedService.update(path,todos).finally(function(){
					$scope.saving = false;
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
				$scope.todos.push({
					title: title,
					completed: false
				});
			}
		};

		$scope.editTodo = function (todo) {
			$scope.editedTodo = todo;
			$scope.originalTodo = angular.extend({}, todo);
		};

		$scope.saveEdits = function (todo, event) {
			// Blur events are automatically triggered after the form submit event.
			// This does some unfortunate logic handling to prevent saving twice.
			if (event === 'blur' && $scope.saveEvent === 'submit') {
				$scope.saveEvent = null;
				return;
			}

			$scope.saveEvent = event;

			if ($scope.reverted) {
				// Todo edits were reverted-- don't save.
				$scope.reverted = null;
				return;
			}

			todo.title = todo.title.trim();

			if (todo.title === $scope.originalTodo.title) {
				$scope.editedTodo = null;
				return;
			}

			store[todo.title ? 'put' : 'delete'](todo)
				.then(function success() {}, function error() {
					todo.title = $scope.originalTodo.title;
				})
				.finally(function () {
					$scope.editedTodo = null;
				});
		};

		$scope.revertEdits = function (todo) {
			todos[todos.indexOf(todo)] = $scope.originalTodo;
			$scope.editedTodo = null;
			$scope.originalTodo = null;
			$scope.reverted = true;
		};

		$scope.removeTodo = function (todo) {
			store.delete(todo);
		};

		$scope.saveTodo = function (todo) {
			store.put(todo);
		};

		$scope.clearCompletedTodos = function () {
			store.clearCompleted();
		};

		$scope.markAll = function (completed) {
			todos.forEach(function (todo) {
				if (todo.completed !== completed) {
					$scope.toggleCompleted(todo, completed);
				}
			});
		};

		init();
	});
