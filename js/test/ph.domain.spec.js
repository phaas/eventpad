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
            App.repository.add(new App.Editor('ID2', 'aaa.txt'));

            expect(App.editorList.list()).toEqual([
                {id: 'ID2', fileName: 'aaa.txt'},
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
    });


    describe('Editor Content View', function () {
        var eventBus, view, Events;

        beforeEach(inject(function (EditorContentView, EventBus, _Events_) {
            Events = _Events_;
            eventBus = new EventBus();
            view = new EditorContentView(eventBus);
        }));

        it('Shouold not have a view for invalid IDs', function () {
            expect(view.get('ID')).toBeUndefined();
        });

        it('Should be created without content', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: ''
            });
        });

        it('Shouold append text', function () {
            eventBus.publish(event('EditorCreated', new Events.EditorCreated('ID', 'fileName')));
            eventBus.publish(event('TextAppended', new Events.TextAppended('ID', 'Content')));

            expect(view.get('ID')).toEqual({
                id: 'ID',
                fileName: 'fileName',
                content: 'Content'
            });
        });

    });
});