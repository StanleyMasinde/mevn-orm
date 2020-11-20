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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield connection_1.default.table(this.tableName()).select('*');
            }
            catch (error) {
                throw new Error(error);
            }
        });
    }
}
exports.default = Model;
