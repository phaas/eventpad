(function () {
    var module = angular.module("ph.eventSourcing", []);

    var EventStore = function () {
        var store = {};

        this.loadEvents = function (id) {
            return store[id] || [];
        };

        this.storeEvent = function (id, type, payload) {
            if (!store[id]) {
                store[id] = [];
            }

            store[id].push({
                type: type,
                payload: payload
            });
        };

        this.exists = function (id) {
            return store[id] && store[id].length;
        };
    };

    var Aggregate = function () {
        this.unsavedEvents = [];
    };

    Aggregate.prototype.applyEvent = function (event) {
        if (this.eventHandlers[event.type]) {
            this.eventHandlers[event.type].call(this, event.payload);
        }
    };

    Aggregate.prototype.apply = function (type, payload) {
        var event = {type: type, payload: payload};
        this.applyEvent(event);
        this.unsavedEvents.push(event)
    };

    Aggregate.prototype.getUnsavedEvents = function () {
        return this.unsavedEvents;
    };

    Aggregate.prototype.initialize = function (events) {
        for (var c = 0; c < events.length; c++) {
            this.applyEvent(events[c]);
        }
    };

    var AggregateRepositoryFactory = function (config) {
        return new AggregateRepository(config.eventStore, config.factory);
    };

    var AggregateRepository = function (EventStore, Factory) {
        this.eventStore = EventStore;
        this.Factory = Factory;
    };

    AggregateRepository.prototype.add = function (aggregate) {
        if (!aggregate.id) {
            throw "Aggregate does not have an id";
        }

        if (this.eventStore.exists(aggregate.id)) {
            throw "Aggregate " + aggregate.id + " already exists";
        }

        var events = aggregate.getUnsavedEvents();

        for (var i = 0; i < events.length; i++) {
            this.eventStore.storeEvent(aggregate.id, events[i].type, events[i].payload);
        }
    };

    AggregateRepository.prototype.load = function (id) {
        var item = this.Factory();
        var events = this.eventStore.loadEvents(id);

        item.initialize(events);
        return item;
    };

    module.service('EventStore', EventStore);
    module.constant('Aggregate', Aggregate);
    module.constant('AggregateRepositoryFactory', AggregateRepositoryFactory);

})();