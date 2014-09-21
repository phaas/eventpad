(function (window, angular) {
    'use strict';

    var module = angular.module('ph.app', ['ph.eventSourcing', 'ph.domain', 'ngRoute']);


    module.config([ '$routeProvider', function ($routeProvider) {

        $routeProvider.when('/list', {
            templateUrl: 'editorList.html',
            controller: 'EditorListCtrl'
        });

        $routeProvider.when('/editor/:id', {
            templateUrl: 'editorContent.html',
            controller: 'EditorCtrl'
        });

        $routeProvider.when('/events/:id', {
            templateUrl: 'events.html',
            controller: 'EventCtrl'
        });

    }]);

    module.run(function (App) {
        var id1 = App.gateway.create("One.txt");
        var id2 = App.gateway.create("Two.txt");
        var id3 = App.gateway.create("Three.txt");

        App.gateway.append(id1, "Some Content =^.^=\n");
        App.gateway.append(id1, "Another line\n");
    });


    module.controller('EditorCtrl', ['$scope', 'App', '$routeParams', function ($scope, App, $routeParams) {
        $scope.id = $routeParams.id;
        $scope.editor = App.editorContent.get($scope.id);
        $scope.append = function (text, position) {
            App.gateway.append($scope.id, text, +position);
        };

        $scope.deleteText = function (position, length) {
            App.gateway.deleteText($scope.id, +position, +length);
        };

        $scope.benchmarkAppend = function (text, position, count) {
            var start = new Date();
            for (var i = 0; i < count; i++) {
                App.gateway.append($scope.id, text, +position);
            }
            var end = new Date();
            console.log("Appended", text.length, "characters", count, "times in", end.valueOf() - start.valueOf(), "ms")
        };
    }]);

    module.controller('EventCtrl', ['$scope', 'App', '$routeParams', function ($scope, App, $routeParams) {
        $scope.id = $routeParams.id;
        $scope.events = App.eventStore.loadEvents($scope.id);
    }]);


    module.controller('EditorListCtrl', ['$scope', 'App', function ($scope, App) {
        $scope.createEditor = function (name) {
            var editor = new App.Editor(App.idGenerator(), name);
            App.repository.add(editor);
        };

        $scope.editorList = function () {
            // the editorList.list function can't be placed directly into the scope since
            // the 'this' reference would be wrong
            return App.editorList.list();
        };
    }]);


})(window, window.angular);