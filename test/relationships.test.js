const { expect } = require('chai')
const { Model } = require('../dist/index')
const { development, production } = require('../knexfile')

/**
 * Create a Farmer class
 */
class Farmer extends Model {
    /**
     * Create a crop relationship
     * @returns relationship
     */
    farms() {
        return this.hasMany('Farm')
    }

    /**
     * A farmer has one profile
     * @returns relationship
     */
    profile() {
        return this.hasOne('Profile')
    }
}
// The first farmer in the database
const farmer = new Farmer(1)

describe('Model relationships', (done) => {
    it('hasOne()', (done) => {
        farmer.profile().then(p => {
            done()
        }).catch(e => {
            done(e)
        })
    })

    it('hasMany()', (done) => {
        farmer.farms().then(p => {
            done()
        }).catch(e => {
            done(e)
        })
    })
})