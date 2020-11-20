require('dotenv').config()
const { expect } = require('chai')
const { Model } = require('../dist/index')

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
        User.all()
        done()
    })
})