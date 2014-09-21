(function (window, angular) {
    "use strict";

    var module = angular.module("ph.domain", ["ph.eventSourcing"]);

    var Events = {
        EditorCreated: function (id, fileName) {
            this.id = id;
            this.fileName = fileName;
        }
    };
    module.constant('Events', Events);


    module.provider("Editor", ['Aggregate', function (Aggregate) {
        var Editor = function (id, fileName) {
            this.constructor();
            if (id && fileName) {
                this.apply('EditorCreated', new Events.EditorCreated(id, fileName));
            }
        };

        Editor.prototype = new Aggregate();
        Editor.prototype.eventHandlers = {
            'EditorCreated': function (event) {
                this.id = event.id;
                this.fileName = event.fileName;
            },
            'Event1': function () {
                this.event1Count++;
            },
            'Event2': function () {
                this.event2Count++;
            }
        };

        return {
            $get: function () {
                return Editor;
            }
        }
    }]);

})(window, window.angular);