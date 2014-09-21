describe("Domain", function () {

    beforeEach(module('ph.domain'));


    it("Should define the Editor domain model", inject(function (Editor) {
        expect(Editor).toBeDefined();

        var e1 = new Editor("ID", "one.txt");
        var e2 = new Editor("e2", "two.txt");

        expect(e1.id).toEqual("ID");
        expect(e2.id).toEqual("e2");
    }));
});