/*global angular */

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
angular.module('todomvc', ["ashamed"])
	.config(function (ashamedConfigProvider) {
		'use strict';

		ashamedConfigProvider.host = "localhost:3000";
	});
