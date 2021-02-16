const { expect } = require('chai')
const { Model } = require('../dist/index')

/**
 * Create a Farmer class
 */
class Farmer extends Model { }

describe('Static model methods tests', () => {
    it('Should plurarize the table name', (done) => {
        expect(Farmer.tableName()).equals('farmers')
        done()
    })

    it('create()', async () => {
        const farmer = await Farmer.create({
            name: 'John Doe',
            email: 'john@mail.com'
        })
        expect(farmer).to.be.an('Object')
        expect(farmer).to.haveOwnProperty('name', 'John Doe')
        expect(farmer).to.haveOwnProperty('email', 'john@mail.com')
    })

    it('all()', async () => {
        const res = await Farmer.all()
        expect(res).to.be.an('array')
    })

    it('first()', async () => {
        const res = await Farmer.first()
        expect(res).to.be.an('object')

    })

    it('find()', async () => {
        const res = await Farmer.find(1)
        expect(res).to.be.an('object')
    })

    it('find() Should null', async () => {
        const res = await Farmer.find(100)
        expect(res).equals(null)
    })

    it('count()', async () => {
        const count = await Farmer.count()
    })

    it('delete()', async () => {
        const res = await Farmer.delete(2)
        expect(res).equals(1)
    })

    it('where().get()', async () => {
        const f = await Farmer
            .where({ name: 'John Doe' })
            .get()
        expect(f).to.be.an('Array')
    })

    it('where().first()', async () => {
        const f = await Farmer
            .where({ name: 'John Doe' })
            .first()
        expect(f).to.be.an('Object')
    })
})
