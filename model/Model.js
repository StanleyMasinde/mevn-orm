/**
 * Model
 */

var pluralize = require('pluralize')
var connection = require('../database/database')
class Model {
    table = this.instanceTable()
    key = 'id'
    id = null
    fillable = []
    static collection = ['ff', 'fff']

    constructor(table) {
        table == undefined ? 0 : this.table = table
    }

    // Static methods

    /**
     * Get the current table
     */
    static getTable() {
        return pluralize(this.name.toLowerCase())
    }

    /**
     * 
     * @param {String} query 
     */
    static query(query, data) {
        let transaction = new Promise((resolve, reject) => {
            connection.query({
                sql: query,
                values: data
            }, function (error, results, fields) {
                if (error) {
                    reject(error)
                } else {
                    resolve(results)
                }

            })
        })
        return transaction
    }

    /**
     * Return all records from the database
     * 
     * @returns Array()
     */
    static all() {
        let query = `SELECT * FROM ${this.getTable()}`
        return this.query(query)
    }

    /**
     * Return the first record from the database
     * @returns Object
     */
    static first() {
        let query = `SELECT * FROM ${this.getTable()} LIMIT 1`
        let transaction = new Promise((resolve, reject) => {
            connection.query({
                sql: query,
                values: []
            }, function (error, results, fields) {
                if (error) {
                    reject(error)
                } else {
                    resolve(results[0])
                }

            })
        })
        return transaction
    }

    /**
     * Create a new resource in the database
     * @param {Array} columns 
     * @returns Void
     */
    static create(columns) {
        columns.created_at = new Date()
        columns.updated_at = new Date()
        let q = `INSERT INTO ${this.instanceTable()} SET ?`
        return this.instanceQuery(q, columns)
    }

    /**
     * Order By latest
     * @returns Array
     */
    static latest() {
        let sql = `SELECT * FROM ${this.getTable()} ORDER BY created_at`
        return this.query(sql, [])
    }

    /**
     * Delete a specified record from the database
     * @param {Number} id 
     */
    static delete(id) {
        var sql = "DELETE FROM ?? WHERE ?? = ?";
        var inserts = [this.getTable(), 'id', id];
        sql = connection.format(sql, inserts);
        return this.query(sql, id)
    }

    // non static methods

    /**
     * 
     * @param {String} query 
     */
    instanceQuery(query, data) {
        let transaction = new Promise((resolve, reject) => {
            connection.query({
                sql: query,
                values: data
            }, function (error, results, fields) {
                if (error) {
                    reject(error)
                } else {
                    resolve(results)
                }

            })
        })
        return transaction
    }
    instanceTable() {
        return pluralize(this.constructor.name.toLowerCase())
    }
    /**
     * Return the id of the current instance
     * @returns {number} id
     */
    getTheCurrentId() {
        return this.id
    }

    /**
     * Update a resource in the database
     * @param {Array} columns 
     */
    update(columns) {
        return `UPDATE Customers SET ContactName = 'Alfred Schmidt', City= 'Frankfurt' WHERE CustomerID = ${this.id}`
    }

    /**
     * 
     * @param {Object} columns 
     */
    save(columns) {
        columns.created_at = new Date()
        columns.updated_at = new Date()
        let q = `INSERT INTO ${this.instanceTable()} SET ?`
        return this.instanceQuery(q, columns)
    }
}

module.exports = Model
