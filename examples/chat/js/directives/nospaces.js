angular.module('chat').directive('noSpaces', function () {
		'use strict';

		var RX = {
			valid : /^[\$a-zA-Z][\$_a-zA-Z0-9]*$/
		}

		return function (scope, elem, attrs) {
			elem.bind('keydown', function (event) {
				var val = elem.val()+event.key;
				if(!RX.valid.test(val)) event.preventDefault();
			});

			scope.$on('$destroy', function () {
				elem.unbind('keydown');
			});
		};
	});
