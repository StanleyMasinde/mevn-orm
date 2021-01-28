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

    /**
     * A farmer can have many crops
     * 
     */
    crops() {
        return this.belongsToMany('Crop')
    }

    /**
     * A farmer has many articles
     */
    articles() {
        return this.morphMany('Article', 'postable')
    }

    /**
     * A farmer has one article
     * 
     */
    article() {
        return this.morphOne('Article', 'postable')
    }
}
// The first farmer in the database
const farmer = new Farmer(1)

describe('Model relationships', async () => {
    it('HasOne()', async () => {
        const profile = await farmer.profile()
        expect(profile.farmer_id).equals(1)
    })

    it('hasMany()', async () => {
        const farms = await farmer.farms()
        expect(farms).to.be.an('Array')
    })

    it('load()', () => {
        const model = farmer.load(['farms', 'profile']).toArray()
        expect(model).to.have.haveOwnProperty('farms')
        expect(model).to.have.haveOwnProperty('profile')
    })

    it('morphOne()', async () => {
        const articles = await farmer.articles()
        expect(articles).to.be.an('Array')
    })

    it('morphMany()', async () => {
        const articles = await farmer.article()
        expect(articles).to.be.an('Object')
    })
})
