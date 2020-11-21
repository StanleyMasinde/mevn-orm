require('dotenv').config()
const { expect } = require('chai')
const Knex = require('knex')
const { Model } = require('../dist/index')
const { default: { development, production } } = require('../dist/config/knexfile')

initDatabase()
/**
 * Create a user class
 */
class User extends Model { }

describe('Static model methods tests', () => {
    it('Should plurarize the table name', (done) => {
        expect(User.tableName()).equals('users')
        done()
    })

    it('all()', (done) => {
        User.all().then(res => {
            expect(res).to.be.an('array')
            done()
        }).catch(err => {
            done(err)
        })

    })

    it('first()', (done) => {
        User.first().then(res => {
            expect(res).to.be.an('object')
            done()
        }).catch(err => {
            done(err)
        })

    })
})

async function initDatabase() {
    const DB = Knex(process.env.NODE_ENV === 'development' ? development : production)
    //await DB.schema.dropTableIfExists('users')
    await DB.schema.createTable('users', (table) => {
        table.bigIncrements('id')
        table.string('name')
        table.string('email').unique()
    })

    await DB.table('users').insert([
        {
            name: 'John Doe',
            email: 'john@mail.com'
        },
        {
            name: 'Jane Doe',
            email: 'jane@mail.com'
        },
        {
            name: 'Ashley Doe',
            email: 'ashley@mail.com'
        },
        {
            name: 'Alice Doe',
            email: 'alice@mail.com'
        }
    ])
}
