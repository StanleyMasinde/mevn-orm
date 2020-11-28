"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const connection_1 = tslib_1.__importDefault(require("./connection"));
const pluralize_1 = tslib_1.__importDefault(require("pluralize"));
class Model {
    constructor(attributes) {
        this.attributes = attributes;
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
    /**
     * Get the first record for the database
     *
     * @returns Promise
     */
    static first() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield connection_1.default
                    .table(this.tableName())
                    .select('*')
                    .first();
            }
            catch (error) {
                throw new Error(error);
            }
        });
    }
    /**
     * Find model by Id
     * @param id
     */
    static find(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield connection_1.default
                    .table(this.tableName())
                    .where({ id })
                    .first();
            }
            catch (error) {
                throw new Error(error);
            }
        });
    }
    /**
     * Delete a model from the database
     * @param id
     */
    static delete(id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield connection_1.default
                    .table(this.tableName())
                    .where({ id })
                    .del();
            }
            catch (error) {
                throw new Error(error);
            }
        });
    }
    /**
     * Create a new Model
     * @param attributes
     */
    static create(attributes = []) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield connection_1.default
                    .table(this.tableName())
                    .insert(attributes);
            }
            catch (error) {
                throw new Error(error);
            }
        });
    }
}
exports.default = Model;
