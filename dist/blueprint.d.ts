export default class BluePrint {
    column: String;
    query: string;
    constructor(column: String);
    primary(): this;
    increaments(): this;
    bigIncreaments(): this;
    string(): this;
    text(): this;
    boolean(): this;
}
