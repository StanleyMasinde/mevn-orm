var { Database, Model, Schema, Table } = require('../index')
var assert = require('assert')

class User extends Model { }

Database.query({
    sql: `DROP TABLE IF EXISTS users, tests`
})

Schema.create('users', () => {
    return [
        new Table().bigIncrements(),
        new Table().string('name'),
        new Table().string('email').unique(),
        new Table().string('password'),
        new Table().timestamps()
    ]
})

describe('Database', () => {
    it('Has connected to the database', (done) => {
        Database.query({
            sql: 'Show Tables',
        }, (err, _results) => {
            if (err) {
                return done(err)
            }
            done()
        })


    })

    it('Has created a table named tests', (done) => {
        Database.query({
            sql: `CREATE TABLE tests (
                id BigInt(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(256)
            )`
        }, (error, _results) => {
            if (error) {
                return done(error)
            }

            done()
        })
    })

    it('Has added a record', (done) => {
        Database.query({
            sql: `INSERT INTO tests (title) values('All Good')`
        }, (error, results) => {
            if (error) {
                return done(error)
            }

            done()
        })
    })
})

// ORM TESTS
describe('ORM', () => {
    it('The table name needs to be pluralised', () => {
        assert.equal(User.getTable(), 'users')
    })

    it('Should Create a new user', (done) => {
        let john = new User()
        john.save({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'secret'
        }).then(() => {
            done()
        }).catch(err => {
            done(err)
        })
    })
})

