"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const connection_1 = tslib_1.__importDefault(require("./connection"));
const pluralize_1 = tslib_1.__importDefault(require("pluralize"));
class Model {
    constructor(config) {
        this.config = config;
        this.table = pluralize_1.default(this.name);
    }
    static tableName() {
        return pluralize_1.default(this.name).toLowerCase();
    }
    static all() {
        connection_1.default.query(`SELECT * FROM ${this.tableName()}`, (err, rows) => {
            if (err) {
                throw new Error(err.sqlMessage);
            }
            console.log(rows);
            return rows;
        });
    }
}
exports.default = Model;
