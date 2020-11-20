import connection from './connection'
import pluralize from 'pluralize'

export default class Model {
    config: any;
    table: String;
    name: any;
    static table: any;
    constructor(config) {
        this.config = config
        this.table = pluralize(this.name)
    }

    static tableName() {
       return pluralize(this.name).toLowerCase()
    }

    public static all() {
       connection.query(`SELECT * FROM ${this.tableName()}`, (err, rows) => {
           if (err) {
               throw new Error(err.sqlMessage);
           }
           console.log(rows);
           return rows
       })
    }
}
