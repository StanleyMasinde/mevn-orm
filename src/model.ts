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

    static tableName() {
        return pluralize(this.name).toLowerCase()
    }

    public static async all() {
        try {
            return await queryBuilder.table(this.tableName()).select('*')
        } catch (error) {
            throw new Error(error);
        }

    }
}
