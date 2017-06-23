module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);

	// Project configuration.
	grunt.initConfig({
	  pkg: grunt.file.readJSON('package.json'),
		browserify: {
			dist: {
				watch: true,
				keepAlive: true,
				files: {
					'dist/ashamed.js': ['browser/ashamed.js'],
					'dist/angular-ashamed.js': ['browser/angular-ashamed.js']
				}
			}
		},
		babel: {
			options: {
				sourceMap: true,
				presets: ['es2015']
			},
			dist: {
				files: {
					'dist/ashamed.js': 'dist/ashamed.js',
					'dist/angular-ashamed.js': 'dist/angular-ashamed.js',
				}
			}
		},
	  uglify: {
	    options: {
	      banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
	    },
			dist : {
				files: {
					'dist/ashamed.min.js' : ['dist/ashamed.js'],
					'dist/angular-ashamed.min.js' : ['dist/angular-ashamed.js'],
	    	}				
			}
	  },
		clean: ['dist/*.js','dist/*.map']
	});

	grunt.registerTask('default', ['browserify','babel','uglify']);
};
