(function (window, angular) {
    'use strict';

    var module = angular.module('ph.eventSourcing', []);

    var EventBus = function () {
        this.handlers = {};
    };

    EventBus.prototype.subscribe = function (event, handler) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(handler);
    };

    EventBus.prototype.publish = function (event) {
        var handlers = this.handlers[event.type];
        if (!handlers) {
            return;
        }

        for (var i = 0, len = handlers.length; i < len; i++) {
            handlers[i](event.payload);
        }
    };


    var EventStore = function () {
        this.store = {};
    };

    EventStore.prototype.loadEvents = function (id) {
        return this.store[id] || [];
    };

    EventStore.prototype.storeEvent = function (id, type, payload) {
        if (!this.store[id]) {
            this.store[id] = [];
        }

        this.store[id].push({
            type: type,
            payload: payload
        });
    };

    EventStore.prototype.exists = function (id) {
        return this.store[id] && this.store[id].length;
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
        if (!type || (typeof(type) !== 'string')) {
            throw 'Invalid event type: ' + type;
        }
        if (!payload) {
            throw 'Event payload for ' + type + ' is undefined';
        }

        var event = {type: type, payload: payload};
        this.applyEvent(event);
        this.unsavedEvents.push(event)
    };

    Aggregate.prototype.getUnsavedEvents = function () {
        return this.unsavedEvents;
    };

    Aggregate.prototype.clearUnsavedEvents = function() {
        this.unsavedEvents = [];
    }

    Aggregate.prototype.initialize = function (events) {
        for (var c = 0; c < events.length; c++) {
            this.applyEvent(events[c]);
        }
    };

    var AggregateRepositoryFactory = function (config) {
        return new AggregateRepository(config.eventStore, config.factory, config.eventBus);
    };

    var AggregateRepository = function (eventStore, Factory, eventBus) {
        this.eventStore = eventStore;
        this.Factory = Factory;
        this.eventBus = eventBus;
    };

    AggregateRepository.prototype.storeAndPublishUnsavedEvents = function (aggregate) {
        var events = aggregate.getUnsavedEvents();

        for (var i = 0; i < events.length; i++) {
            this.eventStore.storeEvent(aggregate.id, events[i].type, events[i].payload);

            if (this.eventBus) {
                this.eventBus.publish(events[i]);
            }
        }
        aggregate.clearUnsavedEvents();
    }

    AggregateRepository.prototype.add = function (aggregate) {
        if (!aggregate.id) {
            throw 'Aggregate does not have an id';
        }

        if (this.eventStore.exists(aggregate.id)) {
            throw 'Aggregate ' + aggregate.id + ' already exists';
        }

        this.storeAndPublishUnsavedEvents(aggregate);
    };

    AggregateRepository.prototype.save = function (aggregate) {
        if (!this.eventStore.exists(aggregate.id)) {
            throw 'Aggregate ' + aggregate.id + ' does not exist';
        }

        this.storeAndPublishUnsavedEvents(aggregate);
    }

    AggregateRepository.prototype.load = function (id) {
        var item = this.Factory();
        var events = this.eventStore.loadEvents(id);

        item.initialize(events);
        return item;
    };

    module.constant('EventStore', EventStore);
    module.constant('EventBus', EventBus);
    module.constant('Aggregate', Aggregate);
    module.constant('AggregateRepositoryFactory', AggregateRepositoryFactory);

})(window, window.angular);