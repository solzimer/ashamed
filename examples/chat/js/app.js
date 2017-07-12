/*global angular */

/**
 * The main chat app module
 *
 * @type {angular.Module}
 */
angular.module('chat', ["ashamed"])
	.config(function (ashamedConfigProvider) {
		'use strict';

		// Ashamed server is on localhost:3000
		ashamedConfigProvider.host = "localhost:3000";
	});
