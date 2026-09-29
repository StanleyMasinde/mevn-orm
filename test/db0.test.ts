import { afterAll, describe, expect, it, vi } from 'vitest'
import { createDatabase, type Database } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import sqlite3 from 'db0/connectors/sqlite3'
import mysql from 'db0/connectors/mysql2'
import { Model, configureDb0 } from '../db0.js'
import { configureDatabase } from '../index.js'

class Person extends Model {
	override table = 'people'
	override fillable = ['name', 'active']

	posts() {
		return this.hasMany(Post, this.id, 'person_id')
	}
}

class Post extends Model {
	override table = 'posts'
	override fillable = ['person_id', 'title']
}

const sqliteDb = createDatabase(sqlite({ name: ':memory:' }))
afterAll(async () => sqliteDb.dispose())

const runSuite = (label: string, makeDb: () => Database, dispose = false) => {
	describe(label, () => {
		let db: Database
		it('creates schema', async () => {
			db = makeDb()
			configureDb0(db)
			await db.exec('DROP TABLE IF EXISTS posts')
			await db.exec('DROP TABLE IF EXISTS people')
			const idColumn = label === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INTEGER PRIMARY KEY AUTO_INCREMENT'
			await db.exec(`CREATE TABLE people (id ${idColumn}, name VARCHAR(255), active INTEGER)`)
			await db.exec(`CREATE TABLE posts (id ${idColumn}, person_id INTEGER, title VARCHAR(255))`)
		})

		it('performs CRUD, pagination, and isolated queries', async () => {
			configureDb0(db)
			const alice = await Person.create({ name: 'Alice', active: true })
			const bob = await Person.create({ name: 'Bob', active: false })
			expect(alice.id).toBeGreaterThan(0)
			expect((await Person.find(alice.id as number))?.name).toBe('Alice')
			const a = Person.where({ id: alice.id })
			const b = Person.where({ id: bob.id })
			const [foundA, foundB] = await Promise.all([a.first(), b.first()])
			expect(foundA?.name).toBe('Alice')
			expect(foundB?.name).toBe('Bob')
			expect(await Person.count()).toBe(2)
			expect((await Person.orderBy('name').paginate(1, 2)).data[0]?.name).toBe('Bob')
			expect(await Person.where({ id: bob.id }).update({ name: 'Bobby' })).toBe(1)
			expect((await Person.find(bob.id as number))?.name).toBe('Bobby')
			expect(await Person.where({ id: bob.id }).destroy()).toBe(1)
			expect(await Person.find(bob.id as number)).toBeNull()
		})

		it('loads relations and binds values', async () => {
			configureDb0(db)
			const person = await Person.first()
			expect(person).not.toBeNull()
			await Post.create({ person_id: person?.id, title: "What's new?" })
			expect((await person?.posts().where({ title: "What's new?" }).get())?.[0]?.title).toBe("What's new?")
			expect(await Person.where({ name: "' OR 1=1 --" }).count()).toBe(0)
			expect(await Post.where({ person_id: person?.id }).where({ person_id: -1 }).count()).toBe(0)
			expect(() => Person.orderBy('name; DROP TABLE people')).toThrow()
		})

		it('supports query helpers and relation pagination', async () => {
			configureDb0(db)
			const person = await Person.create({ name: 'Query Person', active: true })
			await Post.create({ person_id: person.id, title: 'Zed' })
			await Post.create({ person_id: person.id, title: 'Amy' })
			const base = Post.where({ person_id: person.id }).orderBy('title')
			expect(await base.clone().limit(1).pluck('title')).toEqual(['Amy'])
			expect(await base.value('title')).toBe('Amy')
			expect(await base.exists()).toBe(true)
			expect(await base.clone().limit(0).exists()).toBe(false)
			expect((await base.firstOrFail()).title).toBe('Amy')
			expect((await person.posts().orderBy('title').paginate(1, 2)).data[0]?.title).toBe('Zed')
			expect(await person.posts().limit(1).count()).toBe(2)
		})

		it('uses db0 after configuring a separate Knex migration connection', async () => {
			const migrationDb = configureDatabase({
				client: 'better-sqlite3',
				connection: { filename: ':memory:' },
			})
			try {
				configureDb0(db)
				expect((await Person.where({ name: 'Alice' }).first())?.name).toBe('Alice')
			} finally {
				await migrationDb.destroy()
			}
		})

		if (dispose) {
			it('disposes connection', async () => db.dispose())
		}
	})
}

runSuite('sqlite', () => sqliteDb)

describe('connector mutation results', () => {
	it('rejects sqlite3 before configuring model writes', () => {
		const db = createDatabase(sqlite3({ name: ':memory:' }))
		expect(() => configureDb0(db)).toThrow(/db0 sqlite3 is not supported/)
	})

	it('accepts PlanetScale insert IDs and affected row counts', async () => {
		const run = vi.fn(async (sql: string) => {
			if (/^insert /i.test(sql)) return { success: true, insertId: '42', rowsAffected: 1 }
			return { success: true, rowsAffected: 1 }
		})
		const db = {
			connector: 'planetscale',
			dialect: 'mysql',
			prepare: (sql: string) => ({
				run: () => run(sql),
				get: async () => ({ id: 42, name: 'Alice', active: 1 }),
			}),
		} as unknown as Database
		configureDb0(db)

		const person = await Person.create({ name: 'Alice', active: true })
		expect(person.id).toBe(42)
		expect(await Person.where({ id: person.id }).update({ name: 'Alicia' })).toBe(1)
		expect(await Person.where({ id: person.id }).destroy()).toBe(1)
		expect(run).toHaveBeenCalledTimes(3)
	})
})

if (process.env.MEVN_TEST_MYSQL_HOST) {
	const mysqlDb = createDatabase(mysql({
		host: process.env.MEVN_TEST_MYSQL_HOST,
		port: Number(process.env.MEVN_TEST_MYSQL_PORT ?? 3306),
		user: process.env.MEVN_TEST_MYSQL_USER ?? 'root',
		password: process.env.MEVN_TEST_MYSQL_PASSWORD ?? '',
		database: process.env.MEVN_TEST_MYSQL_DATABASE ?? 'mevn_test',
	}))
	runSuite('mysql', () => mysqlDb, true)
}
