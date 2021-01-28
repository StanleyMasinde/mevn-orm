import queryBuilder from './connection'
import pluralize from 'pluralize'
import relationships from './relationships'

class Model {
    collection: {}
    /**
     * These columns are hidden in collections
     */
    hidden: any[]

    /**
     * Model ID
     */
    id: number

    /**
     * Model name 
     */
    modelName: string

    /**
     * The current table
     */
    table: any

    /**
     * The foreign key
     */
    foreignKey: string

    /**
     * Contains the db record 
     */
    currentModel: any
    
    static collection: any
    /**
     * New Model instance
     * @param id the database ID of the model
     */
    constructor(id = 0, attributes: { [x: string]: any; } = {}) {
        this.collection = {}
        this.hidden = []
        this.id = id
        this.modelName = this.constructor.name.toLowerCase()
        this.table = pluralize(this.modelName)
        this.foreignKey = `${this.modelName}_id`
        
        for (const a in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, a)) {
                this[a] = attributes[a]
            }
        }

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
     * Return an array rep of a model
     */
    toArray() {
        return this.currentModel
    }
     
     /**
      * ========================================================================
      *      STATIC METHODS
      * ========================================================================
      */
     
     /**
      * Create a collection to return to the user
      * @param { String| Array } elements 
      * @returns Array()
      */
    private static collect(elements: string | Array<any> = '') {
        console.log(this.collection);
        
        this.collection.push(elements)
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
            const m = await queryBuilder
                .table(this.tableName())
                .where({ id })
                .first()
            return new this(id, m)
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
}

// Assign the relationships
Object.assign(Model.prototype, relationships)
export default Model
