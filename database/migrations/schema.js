var db = require('../database')
/**
 * Schema Creator
 */
class Schema {

    /**
     * Create a table in the database
     * @param {String} table 
     * @param {function()} callback 
     */
    static create(table, callback) {
        let queryObject = callback()
        let columns = Object.values(queryObject).map(el => {
            return el.statement
        })

        let q = `CREATE TABLE ${table} (${columns.toString()})`
        return new Promise((resolve, reject) => {
            db.query({
                sql: q,
                values: []
            }, function (error, results, fields) {
                if (error) {
                    reject(error)
                } else {
                    resolve(results)
                }
            })
        })
    }

    /**
     * Drop a table from the database
     * @param {String} table 
     */
    static drop(table) {
        let q = `DROP Table ${table}`
        return new Promise((resolve, reject) => {
            db.query({
                sql: q,
                values: []
            }, function (error, results, fields) {
                if (error) {
                    reject(error)
                } else {
                    resolve(results)
                }
            })
        })
    }
}

module.exports = Schema
