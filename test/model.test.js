/* eslint-disable no-undef */
const { Model, DB } = require('../index')
const faker = require('faker')
const { expect } = require('chai')
class Profile extends Model {
	fillable = ['farmer_id', 'bio']
}
class Farmer extends Model {
	fillable = ['name', 'email', 'password']
	hidden = ['password']

	profile() {
		return this.hasOne(Profile)
	}
}

DB(Farmer)

describe('#Model tests', () => {
	it('#Model instance', async () => {
		const farmer = new Farmer({
			name: faker.name.findName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		await farmer.save()
		expect(farmer).to.an('Object')
	})

	it('#find a model', async () => {
		const farmer = await Farmer.find(1)
		expect(farmer).to.an('Object')
	})

	it('#create a model', async () => {
		const farmer = await Farmer.create({
			name: faker.name.findName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).to.an('Object')
		expect(farmer.id).to.be.a('number')
	})

	it('#Has one relationship', async () => {
		const farmer = new Farmer({
			name: faker.name.findName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		await farmer.save()
		await new Profile({
			farmer_id: farmer.id,
			bio: faker.lorem.sentence()
		}).save()
		expect(farmer).to.an('Object')
		const farmerProfile = await farmer.profile()
		expect(farmerProfile).to.haveOwnProperty('farmer_id', farmer.id)
	})
})