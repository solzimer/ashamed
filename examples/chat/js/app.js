/*global angular */

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
angular.module('chat', ["ashamed"])
	.config(function (ashamedConfigProvider) {
		'use strict';

		ashamedConfigProvider.host = "localhost:3000";
	});
