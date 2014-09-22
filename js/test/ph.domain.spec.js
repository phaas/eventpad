describe('Domain', function () {
    function event(type, payload) {
        return {
            type: type,
            payload: payload
        }
    }

    beforeEach(module('ph.domain'));


    it('Should define the Editor domain model', inject(function (Editor) {
        expect(Editor).toBeDefined();

        var e1 = new Editor('ID', 'one.txt');
        var e2 = new Editor('e2', 'two.txt');

        expect(e1.id).toEqual('ID');
        expect(e2.id).toEqual('e2');
    }));


    it('Should initialize the app', inject(function (App) {
        expect(App).toBeDefined();
        expect(App.editorList).toBeDefined();
        expect(App.editorContent).toBeDefined();
        expect(App.idGenerator()).toEqual('Id0');
    }));


    describe('Editor', function () {

        var editor, Events;
        beforeEach(inject(function (Editor, _Events_) {
            Events = _Events_;
            editor = new Editor('ID', 'file.txt');
            editor.clearUnsavedEvents();
        }));

        it('Should append words', function () {
            editor.append('Hello');
            expect(editor.getUnsavedEvents()).toEqual([
                event('TextAppended', new Events.TextAppended('ID', 'Hello'))
            ]);

            editor.append('World');
            expect(editor.getUnsavedEvents()).toEqual([
                event('TextAppended', new Events.TextAppended('ID', 'Hello')),
                event('TextAppended', new Events.TextAppended('ID', 'World'))
            ]);
        });

        it('Should append text at the specified position', function () {
            editor.append('0123456789');
            editor.append('X', 9);
            editor.append('X', 8);
            editor.append('X', 1);
            editor.append('X', 0);


            expect(editor.getUnsavedEvents()).toEqual([
                event('TextAppended', new Events.TextAppended('ID', '0123456789')),
                event('TextAppended', new Events.TextAppended('ID', 'X', 9)),
                event('TextAppended', new Events.TextAppended('ID', 'X', 8)),
                event('TextAppended', new Events.TextAppended('ID', 'X', 1)),
                event('TextAppended', new Events.TextAppended('ID', 'X', 0))
            ]);
        });

        it('Should verify the position of appended text', function () {
            expect(function () {
                editor.append('Q', 10);
            }).toThrow("Can not insert text at position 10, content length is 0");
        });

        it('Should delete text', function () {
            editor.append('0123456789');
            editor.clearUnsavedEvents();

            editor.deleteText(5, 3);

            expect(editor.getUnsavedEvents()).toEqual([
                event('TextDeleted', new Events.TextDeleted('ID', 5, 3, '567'))
            ]);

            editor.deleteText(0, 7);
            expect(editor.getUnsavedEvents()).toEqual([
                event('TextDeleted', new Events.TextDeleted('ID', 5, 3, '567')),
                event('TextDeleted', new Events.TextDeleted('ID', 0, 7, '0123489'))
            ]);
        });
        it('Should delete text 2', function () {
            editor.append('012345678901234567890123456789');
            editor.clearUnsavedEvents();

            editor.deleteText(10, 12);

            expect(editor.getUnsavedEvents()).toEqual([
                event('TextDeleted', new Events.TextDeleted('ID', 10, 12, '012345678901'))
            ]);
        });

        it('Should verify the position of deleted text', function () {

            var scenarios = [
                // position, length, error
                [0, 1, "Can not delete 1 characters at position 0, content is only 0 characters"],
                [-1, 0, "Position must be >= 0"],
                [null, 0, "Position must be >= 0"],
                [undefined, 0, "Position must be >= 0"],
                [NaN, 0, "Position must be >= 0"],
                [0, 0, "Length must be > 0"],
                [0, null, "Length must be > 0"],
                [0, undefined, "Length must be > 0"],
                [0, NaN, "Length must be > 0"]
            ];

            for (var i = 0; i < scenarios.length; i++) {
                var position = scenarios[i][0],
                    length = scenarios[i][1],
                    expected = scenarios[i][2];
                expect(function () {
                    editor.deleteText(position, length);
                }).toThrow(expected);
            }

            editor.append("0123456789");
            editor.deleteText(0, 8);

            expect(function () {
                editor.deleteText(0, 3);
            }).toThrow("Can not delete 3 characters at position 0, content is only 2 characters")

            editor.deleteText(0, 2);

            expect(function () {
                editor.deleteText(0, 1);
            }).toThrow("Can not delete 1 characters at position 0, content is only 0 characters")
        });
    });

    describe('Id Generator', function () {
        it('Should generate a generator', inject(function (IdGenerator) {
            var gen = IdGenerator('PREFIX');

            expect(gen()).toEqual('PREFIX0');
            expect(gen()).toEqual('PREFIX1');
            expect(gen()).toEqual('PREFIX2');
            expect(gen()).toEqual('PREFIX3');
        }));

        it('Should provide independent sequences', inject(function (IdGenerator) {
            var x = IdGenerator('X');
            var y = IdGenerator('Y');

            expect(x()).toEqual('X0');
            expect(y()).toEqual('Y0');
            expect(x()).toEqual('X1');
            expect(y()).toEqual('Y1');
        }));
    });

    describe('Editor List View', function () {
        it('Should have a list of Editors', inject(function (App) {
            expect(App.editorList.list()).toEqual([]);

            var a = new App.Editor('ID1', 'file.txt');
            App.repository.add(a);

            expect(App.editorList.list()).toEqual([
                {id: 'ID1', fileName: 'file.txt'}
            ]);
        }));

        it('Should sort items alphabetically by fileName', inject(function (App, Editor) {
            App.repository.add(new App.Editor('ID1', 'zzz.txt'));
            App.repository.add(new App.Editor('ID3', 'B.txt'));
            App.repository.add(new App.Editor('ID2', 'aaa.txt'));
            App.repository.add(new App.Editor('ID4', 'C.txt'));

            expect(App.editorList.list()).toEqual([
                {id: 'ID2', fileName: 'aaa.txt'},
                {id: 'ID3', fileName: 'B.txt'},
                {id: 'ID4', fileName: 'C.txt'},
                {id: 'ID1', fileName: 'zzz.txt'}
            ]);
        }));
    });

    describe('EditorCommandGateway', function () {

        var gateway, repository;
        beforeEach(inject(function (EditorCommandGateway, Editor, IdGenerator) {
            repository = jasmine.createSpyObj('repository', ['add', 'load', 'save']);

            gateway = new EditorCommandGateway(Editor, repository, IdGenerator('ID'));

        }));

        it('Should handle create commands', function () {
            gateway.create('name');

            expect(repository.add).toHaveBeenCalled();
        });

        it('Should handle append commands', function () {
            var dummy = jasmine.createSpyObj('Editor', ['append']);

            repository.load.and.returnValue(dummy);

            gateway.append('ID', 'Text to append');

            expect(repository.load).toHaveBeenCalledWith('ID');
            expect(dummy.append).toHaveBeenCalledWith('Text to append');
            expect(repository.save).toHaveBeenCalledWith(dummy);
        });

        it('Shouold handle delete commands', function () {
            var dummy = jasmine.createSpyObj('Editor', ['deleteText']);

            repository.load.and.returnValue(dummy);

            gateway.deleteText('ID', 4, 2);

            expect(repository.load).toHaveBeenCalledWith('ID');
            expect(dummy.deleteText).toHaveBeenCalledWith(4, 2);
            expect(repository.save).toHaveBeenCalledWith(dummy);
        })
    });


    describe('Editor Content View', function () {
        var eventBus, view, Events;

        beforeEach(inject(function (EditorContentView, EventBus, _Events_) {
            Events = _Events_;
            eventBus = new EventBus();
            view = new EditorContentView(eventBus);
        }));

        it('Should not have a view for invalid IDs', function () {
            expect(view.get('ID')).toBeUndefined();
        });

        it('Should be created without content', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: '',
                contentLength: 0
            });
        });

        it('Should append text', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', 'Content')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: 'Content',
                contentLength: 7
            });
        });

        it('Should append text at the specified position', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', '0123456789')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: '0123456789',
                contentLength: 10
            });

            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', 'X', 10)));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', 'X', 5)));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', 'X', 0)));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: 'X01234X56789X',
                contentLength: 13
            });
        });

        it('Should delete text', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', '0123456789')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: '0123456789',
                contentLength: 10
            });

            eventBus.publish(event('TextDeleted', new Events.TextDeleted('ID', 0, 5, '01234')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: '56789',
                contentLength: 5
            });

            eventBus.publish(event('TextDeleted', new Events.TextDeleted('ID', 0, 5, '56789')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: '',
                contentLength: 0
            });
        });
    });
});