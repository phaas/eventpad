(function (window, angular) {
    'use strict';

    var module = angular.module('ph.domain', ['ph.eventSourcing']);

    var Events = {
        EditorCreated: function (id, fileName) {
            this.id = id;
            this.fileName = fileName;
        },
        TextAppended: function (id, text, position) {
            this.id = id;
            this.text = text;
            this.position = position;
        }
    };
    module.constant('Events', Events);


    module.provider('Editor', ['Aggregate', function (Aggregate) {
        var Editor = function (id, fileName) {
            this.constructor();
            this.contentLength = 0;
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
            'TextAppended': function (event) {
                this.contentLength += event.text.length;
            },
            'Event2': function () {
                this.event2Count++;
            }
        };

        Editor.prototype.append = function (text, position) {
            if (position > this.contentLength) {
                throw "Can not insert text at position " + position + ", content length is " + this.contentLength;
            }
            this.apply('TextAppended', new Events.TextAppended(this.id, text, position));
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
                var aa = a.fileName.toLowerCase(), bb = b.fileName.toLowerCase();
                if (aa < bb) {
                    return -1;
                } else if (aa == bb) {
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
                content: '',
                contentLength: 0
            };
        });
        EventBus.subscribe('TextAppended', function (event) {
            var view = data[event.id];

            if (event.position !== undefined) {
                view.content =
                    view.content.slice(0, event.position)
                        + event.text
                        + view.content.slice(event.position, view.content.length);

            } else {
                view.content += event.text;
            }

            view.contentLength += event.text.length;
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