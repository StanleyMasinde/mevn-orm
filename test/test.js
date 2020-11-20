require('dotenv').config()
const { expect } = require('chai')
const Knex = require('knex')
const { Model } = require('../dist/index')
const { default: { development, production } } = require('../dist/config/knexfile')

const DB = Knex(process.env.NODE_ENV === 'development' ? development : production)
DB.schema.createTable('users', (table) => {
    table.bigIncrements('id')
    table.string('name')
    table.string('email')
}).then(r => {
    return r
}).catch(e => {
    throw new Error(e)
})
/**
 * Create a user class
 */
class User extends Model { }
describe('Static model tests', () => {
    it('Should plurarize the table name', (done) => {
        expect(User.tableName()).equals('users')
        done()
    })

    it('Should return all records', (done) => {
        User.all().then(res => {
            done()
        }).catch(err => {
            done(err)
        })

    })
})