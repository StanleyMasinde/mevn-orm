import queryBuilder from './connection'
import pluralize from 'pluralize'

export default class Model {
    table: String;
    name: any;
    static table: any;
    attributes: any;
    constructor(attributes: any) {
        this.attributes = attributes
        this.table = pluralize(this.name)
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
