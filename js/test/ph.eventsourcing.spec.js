describe("Event Sourcing", function () {

    function event(type, payload) {
        return {
            type: type,
            payload: payload
        }
    }

    beforeEach(module('ph.eventSourcing'));

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


    describe("Aggregate", function () {
        var Dummy, dummy;

        beforeEach(inject(function createDummyDomainObject(Aggregate) {
            Dummy = function Dummy() {
                this.event1Count = 0;
                this.event2Count = 0;
            };

            Dummy.prototype = new Aggregate();
            Dummy.prototype.eventHandlers = {
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

            dummy = new Dummy();
            spyOn(dummy.eventHandlers, 'Event1').and.callThrough();
            spyOn(dummy.eventHandlers, 'Event2').and.callThrough();
        }));

        describe("DummyAggregate", function () {
            it("Should count events", function () {
                var agg = new Dummy();
                agg.command1();
                agg.command2();
                agg.command2();

                expect(agg.event1Count).toBe(1);
                expect(agg.event2Count).toBe(2);
            });
        })

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
            expect(dummy.getUnsavedEvents()).toEqual([]);
        })

        it("Should store applied events", function () {
            dummy.command1();
            dummy.command2();

            expect(dummy.getUnsavedEvents()).toEqual([
                event('Event1', {}), event('Event2', {})
            ]);
        });
    })
});
