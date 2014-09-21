module.exports = function (config) {
    config.set({
        autoWatch: true,
        basePath: '../',
        frameworks: ['jasmine'],

        files: [
            'vendor/angular-*.js',
            'ph.*.js',
            'test/*.spec.js'
        ],

        singleRun: false,

        plugins: [
            'karma-jasmine'
        ]
    });

}