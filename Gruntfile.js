var config = require('config');

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                email: 'github@ericjmartin.com',
                password: config.password,
                branch: 'default'
            },
            dist: {
                src: ['dist/*.js']
            }
        }
    });
}
