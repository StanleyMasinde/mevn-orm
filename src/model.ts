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

    // Values to be hidden in collections
    hidden: [];

    // return a collection
    collection: {};

    // The current Model
    currentModel: Promise<any[]>;


    /**
     * New Model instance
     * @param id the database ID of the model
     */
    constructor(id = 0) {
        this.collection = {}
        this.hidden = []
        this.id = id
        this.modelName = this.constructor.name.toLowerCase()
        this.table = pluralize(this.modelName)
        this.foreignKey = `${this.modelName}_id`

        this.fetch().then((c) => {
            this.currentModel = c
        })
    }

    /**
     * Fetch the current model from the database
     */
    async fetch() {
        try {
            return queryBuilder
                .table(this.table)
                .where('id', this.id)
                .first()
        } catch (error) {
            throw new Error(error).stack;
        }
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
     * Relationships to load this the current model
     * @param {Array} relations 
     */
    load(relations: Array<any> = []) {
        this.collection[this.modelName] = this.currentModel
        relations.forEach(function (relation: string | number) {
            const rows = this[relation]()
            this.collection[this.modelName][relation] = rows
        }, this)
        return this.collection[this.modelName]
    }

    /**
     * Define a HasOne relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    async hasOne(related: string, primaryKey: number | any = null, foreignKey: number | any = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id

        return await queryBuilder
            .table(pluralize(related.toLowerCase()))
            // in the form of model_id
            .where(fk, pk)
            .first()
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    }

    /**
     * Define a HasMany relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    async hasMany(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id

        return await queryBuilder
            .table(pluralize(related.toLowerCase()))
            .where(fk, pk)
            .select('*')
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    }

    /**
     * Define a reverse has one relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    async belongsTo(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id
        return await queryBuilder
            .table(this.table)
            // in the form of model_id
            .where(fk, pk)
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    }

    /**
     * Define a Many to many relationship relationship
     * @param {String} related 
     */
    belongsToMany(related: string, primaryKey: string = null, foreignKey: string = null) {
        // look for a pivot table
        // eg Farmer has many Crops crop_farmer is the table
        // We'll use class names ['This Class, Related Class'].sort
        const relatedName = related.toLowerCase()
        const pivotTable = [this.modelName, relatedName].sort().join('_')
        const firstCol = `${this.modelName}_id`
        const secondCol = `${relatedName}_id`

        // TODO Honestly I believe there is a better way
        // Gets the related IDs from the pivot table
        const firstQuery = queryBuilder
            .table(pivotTable)
            .where(firstCol, this.id)
            .select(secondCol)
            .toQuery()

        // Get the records for the other table
        return firstQuery
    }

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
     * Get rows that match some conditions
     * @param {Object} conditions 
     */
    public static async where(conditions: object = {}) {
        try {
            return await queryBuilder
            .table(this.tableName())
            .where(conditions)
            .select('*')
        } catch (error) {
            throw error
        }
    }

    /**
     * Get rows that match some conditions
     * @param {Object} conditions 
     */
    public static async whereFirst(conditions: object = {}) {
        try {
            return await queryBuilder
            .table(this.tableName())
            .where(conditions)
            .first()
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
