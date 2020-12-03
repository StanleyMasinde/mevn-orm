"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const connection_1 = tslib_1.__importDefault(require("./connection"));
const pluralize_1 = tslib_1.__importDefault(require("pluralize"));
class Model {
    /**
     * New Model instance
     * @param id the database ID of the model
     */
    constructor(id = 0) {
        this.id = id;
        this.modelName = this.constructor.name.toLowerCase();
        this.table = pluralize_1.default(this.modelName);
        this.foreignKey = `${this.modelName}_id`;
    }
    /**
     * Delete the current model
     * @returns {Promise} deletes item from the database
     */
    async destroy() {
        try {
            await connection_1.default
                .table(this.table)
                .where({ id: this.id })
                .delete();
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Update a given model
     * @param {Array} attributes fields
     * @returns {Promise|any} updates a model in the database
     */
    async update(attributes = []) {
        try {
            await connection_1.default
                .table(this.table)
                .where({ id: this.id })
                .update(attributes);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * -----------------------------------------------
     *               Relationships
     * -----------------------------------------------
     */
    /**
     * Define a HasOne relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    hasOne(related, primaryKey = null, foreignKey = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey;
        const pk = primaryKey || this.id;
        return connection_1.default
            .table(pluralize_1.default(related.toLowerCase()))
            // in the form of model_id
            .where(fk, pk)
            .first();
    }
    /**
     * Define a HasMany relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    hasMany(related, primaryKey = null, foreignKey = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey;
        const pk = primaryKey || this.id;
        return connection_1.default
            .table(pluralize_1.default(related.toLowerCase()))
            .where(fk, pk);
    }
    /**
     * Define a reverse has one relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    belongsTo(related, primaryKey = null, foreignKey = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey;
        const pk = primaryKey || this.id;
        return connection_1.default
            .table(this.table)
            // in the form of model_id
            .where(fk, pk);
    }
    /**
     * Define a Many to many relationship relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    BelongsToMany(related, primaryKey = null, foreignKey = null) { }
    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName() {
        return pluralize_1.default(this.name).toLowerCase();
    }
    /**
     * Get the Model count
     */
    static async count() {
        try {
            return await connection_1.default
                .table(this.tableName())
                .count();
        }
        catch (error) {
            throw error;
        }
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
            throw error;
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
            throw error;
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
            throw error;
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
            throw error;
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
            throw error;
        }
    }
}
exports.default = Model;
