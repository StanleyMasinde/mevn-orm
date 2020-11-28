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
    /**
     * Find model by Id
     * @param id
     */
    static async find(id) {
        try {
            return await connection_1.default
                .table(this.tableName())
                .where({ id })
                .first();
        }
        catch (error) {
            throw new Error(error);
        }
    }
    /**
     * Delete a model from the database
     * @param id
     */
    static async delete(id) {
        try {
            return await connection_1.default
                .table(this.tableName())
                .where({ id })
                .del();
        }
        catch (error) {
            throw new Error(error);
        }
    }
    /**
     * Create a new Model
     * @param attributes
     */
    static async create(attributes = []) {
        try {
            return await connection_1.default
                .table(this.tableName())
                .insert(attributes);
        }
        catch (error) {
            throw new Error(error);
        }
    }
}
exports.default = Model;
