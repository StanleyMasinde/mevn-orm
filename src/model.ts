import queryBuilder from './connection'
import pluralize from 'pluralize'

export default class Model {
    // The instance table name
    table: any;
    // Current class name (Only important in TS)
    name: String;

    // Get the table name
    static table: any;

    // Database Id 
    // TODO add more primary key type options
    id: number;

    // The name of the current model in lowercase
    modelName: string;

    // The default foreign key in the form of model_id
    foreignKey: string;

    /**
     * New Model instance
     * @param id the database ID of the model
     */
    constructor(id = 0) {
        this.id = id
        this.modelName = this.constructor.name.toLowerCase()
        this.table = pluralize(this.modelName)
        this.foreignKey = `${this.modelName}_id`
    }

    /**
     * Delete the current model
     * @returns {Promise} deletes item from the database
     */
    async destroy(): Promise<any> {
        try {
            await queryBuilder
                .table(this.table)
                .where({ id: this.id })
                .delete()
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update a given model
     * @param {Array} attributes fields
     * @returns {Promise|any} updates a model in the database
     */
    async update(attributes: Array<any> = []): Promise<any> {
        try {
            await queryBuilder
                .table(this.table)
                .where({ id: this.id })
                .update(attributes)
        } catch (error) {
            throw error
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
    hasOne(related: string, primaryKey: number | any = null, foreignKey: number | any = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id
        return queryBuilder
            .table(pluralize(related.toLowerCase()))
            // in the form of model_id
            .where(fk, pk)
            .first()
            .toSQL()
    }

    /**
     * Define a HasMany relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    hasMany(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id
        return queryBuilder
            .table(pluralize(related.toLowerCase()))
            // in the form of model_id
            .where(fk, pk)
            .toSQL()
    }

    /**
     * Define a reverse has one relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    belongsTo(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id
        return queryBuilder
            .table(this.table)
            // in the form of model_id
            .where(fk, pk)
            .toSQL()
    }

    /**
     * Define a Many to many relationship relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    BelongsToMany(related: string, primaryKey: string = null, foreignKey: string = null) { }

    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName() {
        return pluralize(this.name).toLowerCase()
    }

    /**
     * Get the Model count
     */
    public static async count() {
        try {
            return await queryBuilder
                .table(this.tableName())
                .count()
        } catch (error) {
            throw error
        }
    }

    /**
     * Get all rows from the database
     * 
     * @returns Promise<>
     */
    public static async all() {
        try {
            return await queryBuilder.table(this.tableName()).select('*')
        } catch (error) {
            throw error
        }

    }

    /**
     * Get the first record for the database
     * 
     * @returns Promise
     */
    public static async first() {
        try {
            return await queryBuilder
                .table(this.tableName())
                .select('*')
                .first()
        } catch (error) {
            throw error

        }
    }

    /**
     * Find model by Id
     * @param id 
     */
    public static async find(id: number) {
        try {
            return await queryBuilder
                .table(this.tableName())
                .where({ id })
                .first()
        } catch (error) {
            throw error
        }
    }

    /**
     * Delete a model from the database
     * @param id 
     */
    public static async delete(id: number) {
        try {
            return await queryBuilder
                .table(this.tableName())
                .where({ id })
                .del()
        } catch (error) {
            throw error
        }
    }

    /**
     * Create a new Model
     * @param attributes 
     */
    public static async create(attributes = []) {
        try {
            return await queryBuilder
                .table(this.tableName())
                .insert(attributes)
        } catch (error) {
            throw error
        }
    }

    /**
     * INSTANCE METHODS
     */


    /**
     * RELATIONSHIPS
     */
}
