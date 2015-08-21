var config = require('config');

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                email: 'vanquish2@gmail.com',
                password: config.password,
                branch: 'vanquish-industries'
            },
            dist: {
                src: ['dist/*.js']
            }
        }
    });
}
