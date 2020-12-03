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
    crops() {
        return this.hasMany('Crop')
    }

    /**
     * A farmer has one profile
     * @returns relationship
     */
    profile() {
        return this.hasOne('Profile')
    }
}

const farmer = new Farmer(1)
console.log(farmer.crops())
console.log(farmer.profile())
