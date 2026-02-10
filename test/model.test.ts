import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'
import {
	Model,
	configureDatabase,
	makeMigration,
	migrateLatest,
	migrateRollback,
	migrateCurrentVersion,
	migrateList,
	setMigrationConfig,
	getMigrationConfig
} from '../index.js'

configureDatabase({
	dialect: 'sqlite',
	filename: './dev.sqlite'
})

class Profile extends Model {
	override fillable = ['farmer_id', 'bio']
	override hidden = ['bio']
}

class Farmer extends Model {
	override fillable = ['name', 'email', 'password']
	override hidden = ['password']

	profile(): Promise<Model | null> {
		return this.hasOne(Profile)
	}
}

describe('#Model tests', () => {
	it('#migration api supports generation and execution', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'mevn-orm-migrations-'))
		const filenameDb = join(tmpdir(), `mevn-orm-${Date.now()}.sqlite`)
		configureDatabase({
			dialect: 'sqlite',
			filename: filenameDb
		})
		setMigrationConfig({ directory, extension: 'js' })
		expect(getMigrationConfig()).toHaveProperty('directory', directory)

		const filename = await makeMigration(`create_test_table_${Date.now()}`)
		expect(existsSync(filename)).toBe(true)

		const latest = await migrateLatest()
		expect(latest.log).toContain(basename(filename))

		const listed = await migrateList()
		expect(listed.completed).toContain(basename(filename))

		const version = await migrateCurrentVersion()
		expect(version).not.toBe('none')

		const rollback = await migrateRollback()
		expect(rollback.log).toContain(basename(filename))

		configureDatabase({
			dialect: 'sqlite',
			filename: './dev.sqlite'
		})
	})

	it('#Model instance', async () => {
		const farmer = new Farmer({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		await farmer.save()
		expect(farmer).toBeTypeOf('object')
	})

	it('#find a model', async () => {
		const farmer = await Farmer.find(1)
		expect(farmer).toBeTypeOf('object')
	})

	it('#Find model should return null on not found', async () => {
		const nonExistent = await Farmer.find(4000)
		expect(nonExistent).toBe(null)
	})

	it('#create a model', async () => {
		const farmer = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).toBeTypeOf('object')
		expect(farmer.id).toBeTypeOf('number')
	})

	it('#create a model emoji', async () => {
		const farmer = await Farmer.create({
			name: 'Name has emoji 😎',
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).toBeTypeOf('object')
		expect(farmer.id).toBeTypeOf('number')
	})

	it('#Update a model with a new instance', async () => {
		const farmer = await Farmer.find(1)
		expect(farmer).not.toBeNull()
		if (!farmer) {
			return
		}
		await farmer.update({
			name: 'new name',
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		expect(farmer).toBeTypeOf('object')
	})

	it('#chain where and first', async () => {
		const farmer = await Farmer.where({ id: 1 }).first()
		expect(farmer).toBeTypeOf('object')
	})

	it('#Return null when not found', async () => {
		const farmer = await Farmer.where({ id: 'ggggggg' }).first()
		expect(farmer).toBe(null)
	})

	it('#Delete a model', async () => {
		const farmer = await Farmer.find(1)
		expect(farmer).not.toBeNull()
		if (!farmer) {
			return
		}
		await farmer.delete()
		expect(await Farmer.find(1)).toBe(null)
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

		expect(farmer).toBeTypeOf('object')
		const farmerProfile = await farmer.profile()
		expect(farmerProfile).toHaveProperty('farmer_id', farmer.id)
		expect(farmerProfile).not.toHaveProperty('bio')
	})

	it('#where scope is consumed after first()', async () => {
		const none = await Farmer.where({ id: 999999 }).first()
		expect(none).toBe(null)

		const anyFarmer = await Farmer.first()
		expect(anyFarmer).not.toBe(null)
	})

	it('#static update applies where scope', async () => {
		const first = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		const second = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})

		const updated = await Farmer.where({ id: first.id }).update({ name: 'Scoped Update' })
		expect(updated).toBe(1)

		const firstAfter = await Farmer.find(first.id as number)
		const secondAfter = await Farmer.find(second.id as number)
		expect(firstAfter).toHaveProperty('name', 'Scoped Update')
		expect(secondAfter).not.toHaveProperty('name', 'Scoped Update')
	})

	it('#static destroy applies where scope', async () => {
		const first = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		const second = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})

		const deleted = await Farmer.where({ id: first.id }).destroy()
		expect(deleted).toBe(1)
		expect(await Farmer.find(first.id as number)).toBe(null)
		expect(await Farmer.find(second.id as number)).not.toBe(null)
	})
})
