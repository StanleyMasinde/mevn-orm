const { expect } = require('chai')
const { Model } = require('../dist/index')
const { default: { development, production } } = require('../dist/config/knexfile')

/**
 * Create a Farmer class
 */
class Farmer extends Model { }

describe('Static model methods tests', () => {
    it('Should plurarize the table name', (done) => {
        expect(Farmer.tableName()).equals('farmers')
        done()
    })

    it('create()', (done) => {
        Farmer
            .create({
                name: 'John Doe',
                email: 'john@mail.com'
            })
            .then((res) => {
                done()
            })
            .catch(err => {
                done(err)
            })

    })

    it('all()', (done) => {
        Farmer.all().then(res => {
            expect(res).to.be.an('array')
            done()
        }).catch(err => {
            done(err)
        })

    })

    it('first()', (done) => {
        Farmer.first().then(res => {
            expect(res).to.be.an('object')
            done()
        }).catch(err => {
            done(err)
        })

    })

    it('find()', (done) => {
        Farmer.find(1)
            .then(res => {
                expect(res).to.be.an('object')
                done()
            })
            .catch(e => {
                done(e)
            })
    })

    it('delete()', (done) => {
        Farmer.delete(2)
            .then(res => {
                expect(res).equals(1)
                done()
            })
            .catch(e => {
                done(e)
            })
    })
})
