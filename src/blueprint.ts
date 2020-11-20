export default class BluePrint {
    column: String;
    query: string;
    constructor(column: String) {
        this.column = column
        this.query = ''
    }

    public primary() {
        return this
    }

    public increaments() {
        return this
    }

    public bigIncreaments() {
        return this
    }

    public string() {
        return this
    }

    public text() {
        return this
    }

    public boolean() {
        return this
    }
}
