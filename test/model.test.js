/* eslint-disable no-undef */
const { Model, DB } = require('../index')
const {faker} = require('@faker-js/faker')
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
			name: faker.person.fullName(),
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

	it('#Find model should return null on not found', async () => {
		const nonExistent = await Farmer.find(4000)
		expect(nonExistent).to.equals(null)
	})

	it('#create a model', async () => {
		const farmer = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).to.an('Object')
		expect(farmer.id).to.be.a('number')
	})

	it('#create a model emoji', async () => {
		const farmer = await Farmer.create({
			name: 'Name has emoji 😎',
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).to.an('Object')
		expect(farmer.id).to.be.a('number')
	})

	it('#Update a model with a new instance', async () => {
		const farmer = await Farmer.find(1)
		await farmer.update({
			name: 'new name',
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).to.an('Object')
	})

	it('#chain where and first', async () => {
		const farmer = await Farmer.where({ id: 1 }).first()
		expect(farmer).to.an('Object')
	})

	it('#Return null when not found', async () => {
		const farmer = await Farmer.where({ id: 'ggggggg' }).first()
		expect(farmer).to.be.null
	})

	it('#Delete a model', async () => {
		const farmer = await Farmer.find(1)
		await farmer.delete()
		expect(await Farmer.find(1)).to.be.null
	})

	it('#Has one relationship', async () => {
		const farmer = new Farmer({
			name: faker.person.fullName(),
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
