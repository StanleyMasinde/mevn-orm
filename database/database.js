require('dotenv').config()
/**
 * Database
 * 
 */
var db = require('mysql')
var connection = db.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
})

connection.connect((err) => {
    if (err) {
        console.error(err)
        console.error(connection.config)
    }
})
module.exports = connection
