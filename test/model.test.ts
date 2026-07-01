import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'
import {
	Model,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
	createKnexConfig,
	configureDatabase,
	getDB,
	makeMigration,
	migrateLatest,
	migrateRollback,
	migrateCurrentVersion,
	migrateList,
	setMigrationConfig,
	getMigrationConfig
} from '../index.js'

configureDatabase({
	client: 'sqlite3',
	connection: {
		filename: './dev.sqlite'
	}
})

class Profile extends Model {
	override fillable = ['farmer_id', 'bio']
	override hidden = ['bio']
}

class Farmer extends Model {
	override fillable = ['name', 'email', 'password']
	override hidden = ['password']

	profile() {
		return this.hasOne(Profile)
	}

	farms() {
		return this.hasMany(Farm)
	}
}

class Farm extends Model {
	override fillable = ['farmer_id', 'name']

	farmer() {
		return this.belongsTo(Farmer, 'farmer_id')
	}
}

class User extends Model {
	override fillable = ['email']

	passwordResetToken() {
		return this.hasOne(PasswordResetToken)
	}
}

class PasswordResetToken extends Model {
	override fillable = ['user_id', 'token']
}

class PasswordReset extends Model {
	override table = 'password_reset_tokens'
	override fillable = ['user_id', 'token']
}

describe('#Model tests', () => {
	it('#migration api supports generation and execution', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'mevn-orm-migrations-'))
		const filenameDb = join(tmpdir(), `mevn-orm-${Date.now()}.sqlite`)
		configureDatabase({
			client: 'sqlite3',
			connection: {
				filename: filenameDb
			}
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
			client: 'sqlite3',
			connection: {
				filename: './dev.sqlite'
			}
		})
	})

	it('#createKnexConfig supports documented client/connection config', () => {
		const config = createKnexConfig({
			client: 'sqlite3',
			connection: {
				filename: './dev.sqlite'
			}
		})

		expect(config.client).toBe('sqlite3')
		expect(config.connection).toEqual({ filename: './dev.sqlite' })
		expect(config.useNullAsDefault).toBe(true)
	})

	it('#createKnexConfig keeps deprecated dialect config working', () => {
		const config = createKnexConfig({
			dialect: 'sqlite',
			filename: './dev.sqlite'
		})

		expect(config.client).toBe('sqlite3')
		expect(config.connection).toEqual({ filename: './dev.sqlite' })
		expect(config.useNullAsDefault).toBe(true)
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
		const farmer = await Farmer.find(1) as Farmer | null
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
		const farmer = await Farmer.find(1) as Farmer | null
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

	it('#relationship methods return lazy relation instances', async () => {
		const farmer = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		}) as Farmer

		const hasOneRelation = farmer.profile()
		expect(hasOneRelation).toBeInstanceOf(HasOneRelation)
		expect(typeof hasOneRelation.where).toBe('function')
		expect(typeof hasOneRelation.first).toBe('function')

		const hasManyRelation = farmer.farms()
		expect(hasManyRelation).toBeInstanceOf(HasManyRelation)
		expect(typeof hasManyRelation.where).toBe('function')
		expect(typeof hasManyRelation.get).toBe('function')

		const farm = await Farm.create({ farmer_id: farmer.id, name: 'Lazy Farm' }) as Farm
		const belongsToRelation = farm.farmer()
		expect(belongsToRelation).toBeInstanceOf(BelongsToRelation)
		expect(typeof belongsToRelation.where).toBe('function')
		expect(typeof belongsToRelation.first).toBe('function')
	})

	it('#static queries honour explicit table overrides', async () => {
		const db = getDB()
		await db.schema.dropTableIfExists('password_reset_tokens')
		await db.schema.createTable('password_reset_tokens', (table) => {
			table.bigIncrements('id')
			table.bigInteger('user_id')
			table.string('token')
		})

		const created = await PasswordReset.create({ user_id: 42, token: 'override-token' }) as PasswordReset
		expect(created).toHaveProperty('id')
		expect(created).toHaveProperty('token', 'override-token')

		const found = await PasswordReset.find(created.id as number)
		expect(found).toHaveProperty('user_id', 42)
		expect(found).toHaveProperty('token', 'override-token')

		const queried = await PasswordReset.where({ user_id: 42 }).first()
		expect(queried).toHaveProperty('token', 'override-token')

		expect(PasswordReset.resolveTable()).toBe('password_reset_tokens')
		expect(PasswordReset.currentTable).toBe('password_reset_tokens')
	})

	it('#camelCase model names resolve to snake_case table names', async () => {
		const db = getDB()
		await db.schema.dropTableIfExists('password_reset_tokens')
		await db.schema.dropTableIfExists('users')
		await db.schema.createTable('users', (table) => {
			table.bigIncrements('id')
			table.string('email')
		})
		await db.schema.createTable('password_reset_tokens', (table) => {
			table.bigIncrements('id')
			table.bigInteger('user_id')
			table.string('token')
		})

		const user = await User.create({ email: `reset-${Date.now()}@mail.test` }) as User
		await PasswordResetToken.create({ user_id: user.id, token: 'abc123' })

		const token = await user.passwordResetToken()
		expect(token).toHaveProperty('user_id', user.id)
		expect(token).toHaveProperty('token', 'abc123')
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

	it('#Has many relationship', async () => {
		const owner = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		}) as Farmer
		await Farm.create({ farmer_id: owner.id, name: 'Farm One' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm Two' })
		const farms = await owner.farms()
		expect(Array.isArray(farms)).toBe(true)
		expect(farms.length).toBe(2)
	})

	it('#Has one relationship supports query chaining', async () => {
		const farmer = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		}) as Farmer
		await new Profile({
			farmer_id: farmer.id,
			bio: faker.lorem.sentence()
		}).save()

		const farmerProfile = await farmer.profile().where({ farmer_id: farmer.id }).first()
		expect(farmerProfile).toHaveProperty('farmer_id', farmer.id)
		expect(farmerProfile).not.toHaveProperty('bio')
	})

	it('#Has many relationship supports query chaining', async () => {
		const owner = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		}) as Farmer
		await Farm.create({ farmer_id: owner.id, name: 'Farm One' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm Two' })

		const farms = await owner.farms().where({ name: 'Farm One' }).get()
		expect(farms.length).toBe(1)
		expect(farms[0]).toHaveProperty('name', 'Farm One')
	})

	it('#Belongs to relationship', async () => {
		const owner = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		const farm = await Farm.create({
			farmer_id: owner.id,
			name: 'Belongs To Farm'
		}) as Farm
		const parentFarmer = await farm.farmer()
		expect(parentFarmer).not.toBeNull()
		expect(parentFarmer).toHaveProperty('id', farm.farmer_id)
	})

	it('#orderBy sorts results at the database level', async () => {
		const farmers = await Farmer.orderBy('name', 'asc').all()
		const names = farmers.map((farmer) => farmer.name)
		expect(names).toEqual([...names].sort())
	})

	it('#where and orderBy compose on the static query builder', async () => {
		const owner = await Farmer.create({
			name: 'Order Owner',
			email: `order-owner-${Date.now()}@mail.test`,
			password: faker.internet.password()
		}) as Farmer
		await Farm.create({ farmer_id: owner.id, name: 'Zebra Farm' })
		await Farm.create({ farmer_id: owner.id, name: 'Alpha Farm' })

		const farms = await Farm.where({ farmer_id: owner.id }).orderBy('name', 'asc').all()
		expect(farms.map((farm) => farm.name)).toEqual(['Alpha Farm', 'Zebra Farm'])
	})

	it('#limit and offset restrict scoped results', async () => {
		const owner = await Farmer.create({
			name: 'Limit Owner',
			email: `limit-owner-${Date.now()}@mail.test`,
			password: faker.internet.password()
		}) as Farmer
		await Farm.create({ farmer_id: owner.id, name: 'Farm A' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm B' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm C' })

		const limited = await Farm.where({ farmer_id: owner.id }).orderBy('name', 'asc').limit(2).all()
		expect(limited.map((farm) => farm.name)).toEqual(['Farm A', 'Farm B'])

		const offset = await Farm.where({ farmer_id: owner.id }).orderBy('name', 'asc').offset(1).limit(1).all()
		expect(offset.map((farm) => farm.name)).toEqual(['Farm B'])
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

	it('#paginate returns paginated data and metadata', async () => {
		const owner = await Farmer.create({
			name: 'Paginate Owner',
			email: `paginate-owner-${Date.now()}@mail.test`,
			password: faker.internet.password()
		}) as Farmer
		await Farm.create({ farmer_id: owner.id, name: 'Farm 1' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm 2' })
		await Farm.create({ farmer_id: owner.id, name: 'Farm 3' })

		const pageOne = await Farm.where({ farmer_id: owner.id }).orderBy('name', 'asc').paginate(2, 1)
		expect(pageOne.data).toHaveLength(2)
		expect(pageOne.total).toBe(3)
		expect(pageOne.per_page).toBe(2)
		expect(pageOne.current_page).toBe(1)
		expect(pageOne.last_page).toBe(2)
		expect(pageOne.next_page).toBe(2)
		expect(pageOne.prev_page).toBe(null)
		expect(pageOne.data[0]).toHaveProperty('name', 'Farm 1')

		const pageTwo = await Farm.where({ farmer_id: owner.id }).orderBy('name', 'asc').paginate(2, 2)
		expect(pageTwo.data).toHaveLength(1)
		expect(pageTwo.current_page).toBe(2)
		expect(pageTwo.next_page).toBe(null)
		expect(pageTwo.prev_page).toBe(1)
		expect(pageTwo.data[0]).toHaveProperty('name', 'Farm 3')
	})

	it('#paginate defaults to 15 items per page and page 1', async () => {
		const result = await Farmer.paginate()
		expect(result.per_page).toBe(15)
		expect(result.current_page).toBe(1)
		expect(result.data.length).toBeLessThanOrEqual(15)
		expect(result.total).toBeGreaterThan(0)
	})

	it('#paginate consumes where scope after execution', async () => {
		const created = await Farmer.create({
			name: faker.person.fullName(),
			email: `paginate-scope-${Date.now()}@mail.test`,
			password: faker.internet.password()
		})

		await Farmer.where({ id: created.id }).paginate(10)
		const unscoped = await Farmer.first()
		expect(unscoped).not.toBe(null)
	})

	it('#toArray serialises a model instance without internal or hidden fields', async () => {
		const farmer = await Farmer.create({
			name: faker.person.fullName(),
			email: `to-array-${Date.now()}@mail.test`,
			password: 'secret-password'
		}) as Farmer

		const data = farmer.toArray()
		expect(data).toHaveProperty('id', farmer.id)
		expect(data).toHaveProperty('name', farmer.name)
		expect(data).toHaveProperty('email', farmer.email)
		expect(data).not.toHaveProperty('password')
		expect(data).not.toHaveProperty('fillable')
		expect(data).not.toHaveProperty('hidden')
		expect(data).not.toHaveProperty('modelName')
		expect(data).not.toHaveProperty('table')
	})

	it('#toArray serialises model collections returned by all()', async () => {
		const created = await Farmer.create({
			name: faker.person.fullName(),
			email: `collection-${Date.now()}@mail.test`,
			password: faker.internet.password()
		})
		const farmers = await Farmer.where({ id: created.id }).all()
		const data = farmers.toArray()

		expect(Array.isArray(data)).toBe(true)
		expect(data.length).toBe(1)
		expect(data[0]).toHaveProperty('id', created.id)
		expect(data[0]).not.toHaveProperty('password')
	})

	it('#all returns models and consumes where scope', async () => {
		const created = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		const filtered = await Farmer.where({ id: created.id }).all()
		expect(filtered.length).toBe(1)

		const allRows = await Farmer.all()
		expect(allRows.length).toBeGreaterThan(1)
	})

	it('#count returns table and scoped counts', async () => {
		const created = await Farmer.create({
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password()
		})
		const total = await Farmer.count()
		expect(total).toBeGreaterThan(0)

		const scoped = await Farmer.where({ id: created.id }).count()
		expect(scoped).toBe(1)
	})

	it('#createMany inserts multiple records', async () => {
		const created = await Farmer.createMany([
			{
				name: faker.person.fullName(),
				email: faker.internet.email(),
				password: faker.internet.password()
			},
			{
				name: faker.person.fullName(),
				email: faker.internet.email(),
				password: faker.internet.password()
			}
		])
		expect(created.length).toBe(2)
		expect(created[0]).toHaveProperty('id')
		expect(created[1]).toHaveProperty('id')
	})

	it('#firstOrCreate reuses existing and creates when missing', async () => {
		const uniqueEmail = `first-or-create-${Date.now()}@mail.test`
		const first = await Farmer.firstOrCreate(
			{ email: uniqueEmail },
			{ name: 'First Or Create', password: 'secret' }
		)
		expect(first).toHaveProperty('email', uniqueEmail)

		const second = await Farmer.firstOrCreate(
			{ email: uniqueEmail },
			{ name: 'Should Not Replace', password: 'secret' }
		)
		expect(second).toHaveProperty('id', first.id)
		expect(second).not.toHaveProperty('name', 'Should Not Replace')
	})

	it('#findOrFail throws when record is missing', async () => {
		await expect(Farmer.findOrFail(9999999)).rejects.toThrow('not found')
	})
})
