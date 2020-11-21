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
    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName() {
        return pluralize_1.default(this.name).toLowerCase();
    }
    /**
     * Get all rows from the database
     *
     * @returns Promise<>
     */
    static async all() {
        try {
            return await connection_1.default.table(this.tableName()).select('*');
        }
        catch (error) {
            throw new Error(error);
        }
    }
    /**
     * Get the first record for the database
     *
     * @returns Promise
     */
    static async first() {
        try {
            return await connection_1.default
                .table(this.tableName())
                .select('*')
                .first();
        }
        catch (error) {
            throw new Error(error);
        }
    }
}
exports.default = Model;
