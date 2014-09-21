(function (window, angular) {
    "use strict";

    var module = angular.module('ph.app', ['ph.eventSourcing', 'ngRoute']);


    module.config([ '$routeProvider', function ($routeProvider) {

        $routeProvider.when('/list', {
            template: "<h1>List</h1>"
        });

        $routeProvider.when('/events', {
            template: "<h1>Events</h1>"
        });

    }]);


})(window, window.angular);