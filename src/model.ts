import queryBuilder from './connection'
import pluralize from 'pluralize'

export default class Model {
    config: any;
    table: String;
    name: any;
    static table: any;
    constructor(config: any) {
        this.config = config
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
     * Get all rows from the database
     * 
     * @returns Promise<>
     */
    public static async all() {
        try {
            return await queryBuilder.table(this.tableName()).select('*')
        } catch (error) {
            throw new Error(error);
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
            throw new Error(error);

        }
    }
}
