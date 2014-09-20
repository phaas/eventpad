(function () {
    var module = angular.module("ph.eventSourcing", []);

    var EventStore = function () {
        var store = {};

        this.loadEvents = function (id) {
            return store[id] || [];
        }

        this.storeEvent = function (id, type, payload) {
            if (!store[id]) {
                store[id] = [];
            }

            store[id].push({
                type: type,
                payload: payload
            });
        }
    };

    var Aggregate = function (eventHandlers) {
        this.eventHandlers = eventHandlers || {};

        this.unsavedEvents = [];
    };
    Aggregate.prototype.applyEvent = function (event) {
        if (this.eventHandlers[event.type]) {
            this.eventHandlers[event.type].call(this,event.payload);
        }
    };

    Aggregate.prototype.apply = function (type, payload) {
        var event = {type: type, payload: payload};
        this.applyEvent(event);
        this.unsavedEvents.push(event)
    };

    Aggregate.prototype.getUnsavedEvents = function() {
        return this.unsavedEvents;
    }


    module.service('EventStore', EventStore);
    module.constant('Aggregate', Aggregate);

})();