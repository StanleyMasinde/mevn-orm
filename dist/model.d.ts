export default class Model {
    table: any;
    name: String;
    static table: any;
    id: number;
    modelName: string;
    foreignKey: string;
    /**
     * New Model instance
     * @param id the database ID of the model
     */
    constructor(id?: number);
    /**
     * Delete the current model
     * @returns {Promise} deletes item from the database
     */
    destroy(): Promise<any>;
    /**
     * Update a given model
     * @param {Array} attributes fields
     * @returns {Promise|any} updates a model in the database
     */
    update(attributes?: Array<any>): Promise<any>;
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
    hasOne(related: string, primaryKey?: number | any, foreignKey?: number | any): import("knex").QueryBuilder<unknown, {
        _base: unknown;
        _hasSelection: false;
        _keys: never;
        _aliases: {};
        _single: false;
        _intersectProps: {};
        _unionProps: undefined;
    }>;
    /**
     * Define a HasMany relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    hasMany(related: string, primaryKey?: string, foreignKey?: string): import("knex").QueryBuilder<unknown, {
        _base: unknown;
        _hasSelection: false;
        _keys: never;
        _aliases: {};
        _single: false;
        _intersectProps: {};
        _unionProps: never;
    }[]>;
    /**
     * Define a reverse has one relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    belongsTo(related: string, primaryKey?: string, foreignKey?: string): import("knex").QueryBuilder<unknown, {
        _base: unknown;
        _hasSelection: false;
        _keys: never;
        _aliases: {};
        _single: false;
        _intersectProps: {};
        _unionProps: never;
    }[]>;
    /**
     * Define a Many to many relationship relationship
     * @param {String} related
     * @param {String} primaryKey
     * @param {String} foreignKey
     */
    BelongsToMany(related: string, primaryKey?: string, foreignKey?: string): void;
    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName(): any;
    /**
     * Get the Model count
     */
    static count(): Promise<{
        [k: string]: string | number;
    }[]>;
    /**
     * Get all rows from the database
     *
     * @returns Promise<>
     */
    static all(): Promise<any[]>;
    /**
     * Get the first record for the database
     *
     * @returns Promise
     */
    static first(): Promise<any>;
    /**
     * Find model by Id
     * @param id
     */
    static find(id: number): Promise<any>;
    /**
     * Delete a model from the database
     * @param id
     */
    static delete(id: number): Promise<number>;
    /**
     * Create a new Model
     * @param attributes
     */
    static create(attributes?: any[]): Promise<number[]>;
}
