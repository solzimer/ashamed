/*global angular */

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
angular.module('todomvc', ['ngRoute', 'ngResource',"ashamed"])
	.config(function ($routeProvider,ashamedConfigProvider) {
		'use strict';

		var routeConfig = {
			controller: 'TodoCtrl',
			templateUrl: 'todomvc-index.html',
			resolve: {
				todos: function (ashamedService) {
					return ashamedService.get("/app/todo").then(function(data){
						if(!data) {
							var store = [];
							ashamedService.set("/app/todo",store);
							return store;
						}
						else {
							return data;
						}
					});
				}
			}
		};

		$routeProvider
			.when('/', routeConfig)
			.when('/:status', routeConfig)
			.otherwise({
				redirectTo: '/'
			});

		ashamedConfigProvider.host = "localhost:3000";
	});
