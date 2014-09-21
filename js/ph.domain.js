(function (window, angular) {
    'use strict';

    var module = angular.module('ph.domain', ['ph.eventSourcing']);

    var Events = {
        EditorCreated: function (id, fileName) {
            this.id = id;
            this.fileName = fileName;
        },
        TextAppended: function (id, text) {
            this.id = id;
            this.text = text;
        }
    };
    module.constant('Events', Events);


    module.provider('Editor', ['Aggregate', function (Aggregate) {
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
            'TextAppended': function () {
                this.event1Count++;
            },
            'Event2': function () {
                this.event2Count++;
            }
        };

        Editor.prototype.append = function (text) {
            this.apply('TextAppended', new Events.TextAppended(this.id, text));
        };

        return {
            $get: function () {
                return Editor;
            }
        }
    }]);


    var EditorListView = function (EventBus) {
        var data = [];
        this.data = data;

        EventBus.subscribe('EditorCreated', function (event) {
            data.push({
                id: event.id,
                fileName: event.fileName
            });

            data.sort(function (a, b) {
                if (a.fileName < b.fileName) {
                    return -1;
                } else if (a.fileName == b.fileName) {
                    return 0;
                } else {
                    return 1;
                }
            })
        });

    };

    EditorListView.prototype.list = function () {
        return this.data;
    }

    module.constant('EditorListView', EditorListView);

    var EditorContentView = function (EventBus) {
        var data = {};
        this.data = data;

        EventBus.subscribe('EditorCreated', function (event) {
            data[event.id] = {
                id: event.id,
                fileName: event.fileName,
                content: ''
            };
        });
        EventBus.subscribe('TextAppended', function(event){
           data[event.id].content += event.text;
        });
    };

    EditorContentView.prototype.get = function (id) {
        return this.data[id];
    }

    module.constant('EditorContentView', EditorContentView);


    var EditorCommandGateway = function (Editor, repository, idGenerator) {
        this.Editor = Editor;
        this.repository = repository;
        this.idGenerator = idGenerator;
    };

    EditorCommandGateway.prototype.create = function (name) {
        var id = this.idGenerator();
        var obj = new this.Editor(id, name);
        this.repository.add(obj);
        return id;
    };

    /*
     * Generate command invocation functions for all aggregate commands.
     */
    angular.forEach(['append'], function (cmd) {
        EditorCommandGateway.prototype[cmd] = function (id /*, args */) {
            var editor = this.repository.load(id);
            var result = editor[cmd].apply(editor, Array.prototype.slice.call(arguments, 1, arguments.length));
            this.repository.save(editor);

            return result;
        }
    });


    module.constant('EditorCommandGateway', EditorCommandGateway);

    module.constant('IdGenerator', function (prefix) {
        var next = 0;
        return function () {
            return '' + prefix + (next++);
        }
    });

    module.provider('App', function () {
        return {
            $get: function (Editor, EventBus, EventStore, AggregateRepositoryFactory, IdGenerator, EditorCommandGateway) {

                var eventBus = new EventBus();
                var eventStore = new EventStore();

                var repository = AggregateRepositoryFactory({
                    eventStore: eventStore,
                    eventBus: eventBus,
                    factory: function () {
                        return new Editor();
                    }
                });
                var idGenerator = IdGenerator('Id');

                return {
                    Editor: Editor,
                    repository: repository,
                    eventBus: eventBus,
                    eventStore: eventStore,
                    editorList: new EditorListView(eventBus),
                    editorContent: new EditorContentView(eventBus),
                    idGenerator: idGenerator,
                    gateway: new EditorCommandGateway(Editor, repository, idGenerator)
                }
            }
        };
    });

})(window, window.angular);