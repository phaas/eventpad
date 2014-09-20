describe("Event Sourcing", function () {

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

        dummy = new Dummy('ID');
        spyOn(dummy.eventHandlers, 'Event1').and.callThrough();
        spyOn(dummy.eventHandlers, 'Event2').and.callThrough();
        spyOn(dummy, 'getUnsavedEvents').and.callThrough();
    }));


    describe("Event Store", function () {
        it("Should initially be empty", inject(function (EventStore) {
            expect(EventStore.loadEvents('ID')).toEqual([]);
        }));

        it("Should remember events", inject(function (EventStore) {
            EventStore.storeEvent('ID', 'EventName', { sequence: 1});

            expect(EventStore.loadEvents('ID')).toEqual([
                event('EventName', {sequence: 1})
            ]);

            EventStore.storeEvent('ID', 'EventName', { sequence: 2});

            expect(EventStore.loadEvents('ID')).toEqual([
                event('EventName', {sequence: 1}),
                event('EventName', {sequence: 2})
            ]);
        }));

        it("Should separate events by aggregate ID", inject(function (EventStore) {
            EventStore.storeEvent('ID1', 'A', {});
            EventStore.storeEvent('ID2', 'A', {});
            EventStore.storeEvent('ID1', 'B', {});
            EventStore.storeEvent('ID2', 'C', {});

            expect(EventStore.loadEvents('ID1')).toEqual(
                [ event('A', {}), event('B', {}) ]);

            expect(EventStore.loadEvents('ID2')).toEqual(
                [ event('A', {}), event('C', {}) ]);
        }));

    });

    describe("DummyAggregate", function () {
        it("Should count events", function () {
            dummy.command1();
            dummy.command2();
            dummy.command2();

            expect(dummy.event1Count).toBe(1);
            expect(dummy.event2Count).toBe(2);
        });

        it("Should be independent", function () {
            var a = new Dummy('A'),
                b = new Dummy('B');

            expect(a.getUnsavedEvents()).toEqual([event('DummyCreated', 'A')]);
            expect(b.getUnsavedEvents()).toEqual([event('DummyCreated', 'B')]);
        });
    })

    describe("Aggregate", function () {
        it("Should handle event dispatch", inject(function () {
            dummy.applyEvent({type: 'Event1', payload: {}});
            dummy.applyEvent({type: 'Event2', payload: "Payload"});

            expect(Dummy.prototype.eventHandlers.Event1).toHaveBeenCalledWith({});
            expect(Dummy.prototype.eventHandlers.Event2).toHaveBeenCalledWith("Payload");
        }));

        it("Should apply events", function () {
            dummy.command1();
            dummy.command1();

            expect(Dummy.prototype.eventHandlers.Event1.calls.count()).toEqual(2);
            expect(Dummy.prototype.eventHandlers.Event2).not.toHaveBeenCalled();
        });

        it("Should not initially have any unsaved events", function () {
            expect(dummy.getUnsavedEvents()).toEqual([event('DummyCreated', 'ID')]);
        })

        it("Should store applied events", function () {
            dummy.command1();
            dummy.command2();

            expect(dummy.getUnsavedEvents()).toEqual([
                event('DummyCreated', 'ID'),
                event('Event1', {}), event('Event2', {})
            ]);
        });

        it("Should initialize from events", function () {
            dummy = new Dummy();
            dummy.initialize([
                event('DummyCreated', 'ID'),
                event('Event1', {}), event('Event2', {}), event('Event2', {})
            ]);

            expect(dummy.event1Count).toBe(1);
            expect(dummy.event2Count).toBe(2);

            expect(dummy.getUnsavedEvents()).toEqual([]);
        })
    });

    describe("AggregateRepository", function () {

        var DummyRepo, EventStore;

        beforeEach(inject(function (_EventStore_, AggregateRepositoryFactory) {
            EventStore = _EventStore_;
            DummyRepo = AggregateRepositoryFactory({
                eventStore: EventStore,
                factory: function () {
                    return new Dummy();
                }
            });

            spyOn(EventStore, "storeEvent").and.callThrough();
        }));

        it("Should persist empty objects", function () {
            DummyRepo.add(dummy);

            expect(dummy.getUnsavedEvents).toHaveBeenCalled();
            expect(EventStore.storeEvent).toHaveBeenCalledWith(
                'ID', 'DummyCreated', 'ID'
            );
        });

        it("Should persist new objects", function () {
            DummyRepo.add(dummy);
            expect(dummy.getUnsavedEvents).toHaveBeenCalled();
            expect(EventStore.storeEvent.calls.count()).toBe(1);
        });

        it("Should load aggregates", function () {
            dummy.command1();
            dummy.command2();

            DummyRepo.add(dummy);

            var copy = DummyRepo.load("ID");

            expect(copy.event1Count).toEqual(dummy.event1Count);
        });

        it("Should not allow aggregates without an ID", function () {
            var noId = new Dummy();

            expect(function () {
                DummyRepo.add(noId)
            }).toThrow();
        });

        it("Should not allow duplicate IDs", function () {
            var one = new Dummy("ID1");
            one.command1();

            DummyRepo.add(one);

            var dup = new Dummy("ID1");

            expect(function () {
                DummyRepo.add(one)
            }).toThrow();
            expect(function () {
                DummyRepo.add(dup)
            }).toThrow();

        });
    });
});
