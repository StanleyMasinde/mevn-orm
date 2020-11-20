"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BluePrint {
    constructor(column) {
        this.column = column;
        this.query = '';
    }
    primary() {
        return this;
    }
    increaments() {
        return this;
    }
    bigIncreaments() {
        return this;
    }
    string() {
        return this;
    }
    text() {
        return this;
    }
    boolean() {
        return this;
    }
}
exports.default = BluePrint;
