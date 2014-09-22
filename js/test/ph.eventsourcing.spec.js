describe('Event Sourcing', function () {

    function event(type, payload) {
        return {
            type: type,
            payload: payload
        }
    }

    beforeEach(module('ph.eventSourcing'));

    var Dummy, dummy;
    beforeEach(inject(function createDummyDomainObject(Aggregate) {
        Dummy = function Dummy(id) {
            this.constructor();
            this.event1Count = 0;
            this.event2Count = 0;

            if (id) {
                this.apply('DummyCreated', id);
            }
        };

        Dummy.prototype = new Aggregate();
        Dummy.prototype.eventHandlers = {
            'DummyCreated': function (id) {
                this.id = id;
            },
            'Event1': function () {
                this.event1Count++;
            },
            'Event2': function () {
                this.event2Count++;
            }
        };

        Dummy.prototype.command1 = function () {
            this.apply('Event1', {});
        };
        Dummy.prototype.command2 = function () {
            this.apply('Event2', {});
        };
        Dummy.prototype.delete = function () {
            this.apply('DummyDeleted', {});
            this.markDeleted();
        };

        dummy = new Dummy('ID');
        spyOn(dummy.eventHandlers, 'Event1').and.callThrough();
        spyOn(dummy.eventHandlers, 'Event2').and.callThrough();
        spyOn(dummy, 'getUnsavedEvents').and.callThrough();
        spyOn(dummy, 'clearUnsavedEvents').and.callThrough();
    }));


    describe('Event Store', function () {
        var eventStore;
        beforeEach(inject(function (EventStore) {
            eventStore = new EventStore();
        }));

        it('Should initially be empty', inject(function () {
            expect(eventStore.loadEvents('ID')).toEqual([]);
        }));

        it('Should remember events', inject(function () {
            eventStore.storeEvent('ID', 'EventName', { sequence: 1});

            expect(eventStore.loadEvents('ID')).toEqual([
                event('EventName', {sequence: 1})
            ]);

            eventStore.storeEvent('ID', 'EventName', { sequence: 2});

            expect(eventStore.loadEvents('ID')).toEqual([
                event('EventName', {sequence: 1}),
                event('EventName', {sequence: 2})
            ]);
        }));

        it('Should separate events by aggregate ID', inject(function () {
            eventStore.storeEvent('ID1', 'A', {});
            eventStore.storeEvent('ID2', 'A', {});
            eventStore.storeEvent('ID1', 'B', {});
            eventStore.storeEvent('ID2', 'C', {});

            expect(eventStore.loadEvents('ID1')).toEqual(
                [ event('A', {}), event('B', {}) ]);

            expect(eventStore.loadEvents('ID2')).toEqual(
                [ event('A', {}), event('C', {}) ]);
        }));

        it('Should delete events', function () {
            eventStore.storeEvent('ID1', 'A', {});

            expect(eventStore.exists('ID1')).toBe(true);

            eventStore.deleteEvents('ID1');

            expect(eventStore.exists('ID1')).toBe(false);
        });

    });

    describe('DummyAggregate', function () {
        it('Should count events', function () {
            dummy.command1();
            dummy.command2();
            dummy.command2();

            expect(dummy.event1Count).toBe(1);
            expect(dummy.event2Count).toBe(2);
        });

        it('Should be independent', function () {
            var a = new Dummy('A'),
                b = new Dummy('B');

            expect(a.getUnsavedEvents()).toEqual([event('DummyCreated', 'A')]);
            expect(b.getUnsavedEvents()).toEqual([event('DummyCreated', 'B')]);
        });
    })

    describe('Aggregate', function () {
        it('Should handle event dispatch', inject(function () {
            dummy.applyEvent({type: 'Event1', payload: {}});
            dummy.applyEvent({type: 'Event2', payload: 'Payload'});

            expect(Dummy.prototype.eventHandlers.Event1).toHaveBeenCalledWith({});
            expect(Dummy.prototype.eventHandlers.Event2).toHaveBeenCalledWith('Payload');
        }));

        it('Should apply events', function () {
            dummy.command1();
            dummy.command1();

            expect(Dummy.prototype.eventHandlers.Event1.calls.count()).toEqual(2);
            expect(Dummy.prototype.eventHandlers.Event2).not.toHaveBeenCalled();
        });

        it('Should not initially have any unsaved events', function () {
            expect(dummy.getUnsavedEvents()).toEqual([event('DummyCreated', 'ID')]);
        });

        it('Should store applied events', function () {
            dummy.command1();
            dummy.command2();

            expect(dummy.getUnsavedEvents()).toEqual([
                event('DummyCreated', 'ID'),
                event('Event1', {}), event('Event2', {})
            ]);
        });

        it('Should initialize from events', function () {
            dummy = new Dummy();
            dummy.initialize([
                event('DummyCreated', 'ID'),
                event('Event1', {}), event('Event2', {}), event('Event2', {})
            ]);

            expect(dummy.event1Count).toBe(1);
            expect(dummy.event2Count).toBe(2);

            expect(dummy.getUnsavedEvents()).toEqual([]);
        });

        it('Should validate applied events', function () {
            expect(function () {
                dummy.apply();
            }).toThrow();
            expect(function () {
                dummy.apply('Type');
            }).toThrow();
        });

        it('Should clear unsaved events after save', function () {
            dummy.command1();

            expect(dummy.getUnsavedEvents()).not.toEqual([]);

            dummy.clearUnsavedEvents();

            expect(dummy.getUnsavedEvents()).toEqual([]);
        });

        it('Should record deletion', function () {
            dummy.clearUnsavedEvents();

            expect(dummy.isDeleted()).toBe(false);

            dummy.delete();

            expect(dummy.getUnsavedEvents()).toEqual([event('DummyDeleted', {})]);
            expect(dummy.isDeleted()).toBe(true);
        })
    });

    describe('AggregateRepository', function () {

        var DummyRepo, eventStore, EventBus;

        beforeEach(inject(function (EventStore, AggregateRepositoryFactory) {
            eventStore = new EventStore();
            EventBus = jasmine.createSpyObj('mockEventBus', ['publish']);
            DummyRepo = AggregateRepositoryFactory({
                eventStore: eventStore,
                eventBus: EventBus,
                factory: function () {
                    return new Dummy();
                }
            });

            spyOn(eventStore, 'storeEvent').and.callThrough();
        }));

        it('Should persist empty objects', function () {
            DummyRepo.add(dummy);

            expect(dummy.getUnsavedEvents).toHaveBeenCalled();
            expect(eventStore.storeEvent).toHaveBeenCalledWith(
                'ID', 'DummyCreated', 'ID'
            );

            expect(dummy.getUnsavedEvents()).toEqual([]);
        });

        it('Should persist new objects', function () {
            DummyRepo.add(dummy);
            expect(dummy.getUnsavedEvents).toHaveBeenCalled();
            expect(eventStore.storeEvent.calls.count()).toBe(1);
        });

        it('Should load aggregates', function () {
            dummy.command1();
            dummy.command2();

            DummyRepo.add(dummy);

            var copy = DummyRepo.load('ID');

            expect(copy.event1Count).toEqual(dummy.event1Count);
        });

        it('Should not allow aggregates without an ID', function () {
            var noId = new Dummy();

            expect(function () {
                DummyRepo.add(noId)
            }).toThrow();
        });

        it('Should not allow duplicate IDs', function () {
            var one = new Dummy('ID1');
            one.command1();

            DummyRepo.add(one);

            var dup = new Dummy('ID1');

            expect(function () {
                DummyRepo.add(one)
            }).toThrow();
            expect(function () {
                DummyRepo.add(dup)
            }).toThrow();
        });

        it('Should save aggregate events', function () {
            DummyRepo.add(dummy);

            var copy = DummyRepo.load('ID');
            expect(copy.event1Count).toEqual(dummy.event1Count);

            copy.command1();
            DummyRepo.save(copy);

            var copy2 = DummyRepo.load('ID');
            expect(copy.event1Count).toEqual(copy2.event1Count);
        });

        it('Should clear the aggregates unsaved events', function () {
            DummyRepo.add(dummy);

            expect(dummy.getUnsavedEvents()).toEqual([]);

            dummy.command1();
            expect(dummy.getUnsavedEvents()).not.toEqual([]);
            DummyRepo.save(dummy);
            expect(dummy.getUnsavedEvents()).toEqual([]);

            dummy.command2();
            expect(dummy.getUnsavedEvents()).not.toEqual([]);
            DummyRepo.save(dummy);
            expect(dummy.getUnsavedEvents()).toEqual([]);
        });

        it('Should publish events', function () {
            var one = new Dummy('ID1');
            DummyRepo.add(one);

            expect(EventBus.publish).toHaveBeenCalledWith({type: 'DummyCreated', payload: 'ID1'});
        });

        it('Should delete aggregates', function () {
            DummyRepo.add(new Dummy('ID1'));

            var tx = DummyRepo.load('ID1');
            tx.delete();

            DummyRepo.save(tx);

            expect(eventStore.exists('ID1')).toBe(false);
        });
    });

    describe('Event Bus', function () {

        var bus, handlers;

        beforeEach(inject(function (EventBus) {
            bus = new EventBus();
            handlers = {
                one: function () {
                },
                two: function () {
                }
            };

            spyOn(handlers, 'one').and.callThrough();
            spyOn(handlers, 'two').and.callThrough();
        }));

        it('Should publish events to listeners', function () {

            bus.subscribe('EventOne', handlers.one);
            bus.subscribe('EventTwo', handlers.two);

            bus.publish(event('EventOne', 1));


            expect(handlers.one).toHaveBeenCalledWith(1);
            expect(handlers.two).not.toHaveBeenCalled();

            handlers.one.calls.reset();

            bus.publish(event('EventTwo', 2));

            expect(handlers.one).not.toHaveBeenCalled();
            expect(handlers.two).toHaveBeenCalledWith(2);
        });

        it('Should allow multiple subscribers', function () {
            bus.subscribe('EventOne', handlers.one);
            bus.subscribe('EventOne', handlers.two);

            bus.publish(event('EventOne', 1));

            expect(handlers.one).toHaveBeenCalledWith(1);
            expect(handlers.two).toHaveBeenCalledWith(1);
        });
    });
});
