import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDatabase, type Database } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { Model, configureDatabase, escapeLike } from '../index.js'
import { configureDb0 } from '../db0.js'
import { setBackend, type TableQuery } from '../src/backend.js'

class Owner extends Model {
	override table = 'filter_owners'
	declare name: string

	items() {
		return this.hasMany(Item, this.id, 'owner_id')
	}
}

class Item extends Model {
	override table = 'filter_items'
	declare owner_id: number
	declare price: number
	declare status: string
	declare title: string
	declare description: string | null
	declare expires_at: string | null
}

const records = [
	{ id: 1, owner_id: 1, price: 100, status: 'available', title: 'Desk', description: 'Blue_ top', expires_at: '2026-01-01 00:00:00.000' },
	{ id: 2, owner_id: 1, price: 200, status: 'reserved', title: 'Chair', description: 'desk companion', expires_at: '2026-03-01 00:00:00.000' },
	{ id: 3, owner_id: 1, price: 50, status: 'retired', title: '50%_! deal', description: null, expires_at: null },
	{ id: 4, owner_id: 2, price: 300, status: 'available', title: 'Outside desk', description: null, expires_at: '2026-04-01 00:00:00.000' },
]

const suite = (label: string, setup: () => Promise<() => Promise<void>>) => {
	describe(`${label} extended filters`, () => {
		let dispose: () => Promise<void>
		beforeAll(async () => { dispose = await setup() })
		afterAll(async () => { await dispose() })

		it('binds comparisons, ranges, membership, and null checks', async () => {
			expect(await Item.where({}).where('price', '>=', 100).orderBy('id').pluck('id')).toEqual([1, 2, 4])
			expect(await Item.where({}).whereBetween('price', [100, 200]).orderBy('id').pluck('id')).toEqual([1, 2])
			expect(await Item.where({}).whereIn('status', ['available', 'reserved']).whereNotIn('price', [300]).orderBy('id').pluck('id')).toEqual([1, 2])
			expect(await Item.where({}).whereIn('status', []).count()).toBe(0)
			expect(await Item.where({}).whereNotIn('status', []).count()).toBe(4)
			expect(await Item.where({}).whereIn('description', [null, 'Blue_ top']).orderBy('id').pluck('id')).toEqual([1, 3, 4])
			expect(await Item.where({}).whereNotIn('description', [null, 'Blue_ top']).pluck('id')).toEqual([2])
			expect(await Item.where({}).whereNull('expires_at').pluck('id')).toEqual([3])
			expect(await Item.where({}).whereNotNull('expires_at').count()).toBe(3)
		})

		it('keeps nested OR groups within the relation parent constraint', async () => {
			const owner = await Owner.findOrFail(1)
			const query = owner.items().where((group) => group
				.whereLike('title', '%Desk%')
				.orWhere((nested) => nested.whereLike('description', '%desk%').where('price', '>', 100)))
			expect((await query.orderBy('id')).map((item) => item.id)).toEqual([1, 2])
			expect(await query.count()).toBe(2)
			expect(await owner.items().where((group) => group.where('price', '>', 0).orWhereLike('title', '%Outside%')).count()).toBe(3)
			expect(await Item.where({ owner_id: 1 }).where((group) => group.whereNull('description').orWhereIn('status', ['reserved'])).orderBy('id').pluck('id')).toEqual([2, 3])
		})

		it('escapes literal LIKE wildcards and defines case-insensitive matching', async () => {
			expect(escapeLike('50%_!')).toBe('50!%!_!!')
			expect(await Item.where({}).whereLike('title', `%${escapeLike('50%_!')}%`).pluck('id')).toEqual([3])
			expect(await Item.where({}).whereILike('title', '%DESK%').orderBy('id').pluck('id')).toEqual([1, 4])
		})

		it('encodes Date bounds as UTC and rejects invalid filter inputs before execution', async () => {
			expect(await Item.where({}).where('expires_at', '>', new Date('2026-02-01T03:00:00+03:00')).orderBy('id').pluck('id')).toEqual([2, 4])
			expect(() => Item.where({}).where('price', '>= 0 OR 1=1' as '>=', 0)).toThrow('Unsupported comparison operator')
			expect(() => Item.where({}).whereIn('title; DROP TABLE filter_items' as 'title', ['Desk'])).toThrow('Invalid SQL identifier')
			expect(() => Item.where({}).whereBetween('price', [null as unknown as number, 100])).toThrow('non-null bounds')
			expect(() => Item.where({}).where('expires_at', '>', new Date('invalid'))).toThrow('Invalid Date')
			expect(() => Item.where({}).where(() => {})).toThrow('Filter group must contain')
			expect(await Item.where({}).where('title', '=', "' OR 1=1 --").count()).toBe(0)
			expect(await Item.where({}).count()).toBe(4)
		})
	})
}

suite('Knex SQLite', async () => {
	const db = configureDatabase({ client: 'better-sqlite3', connection: { filename: ':memory:' } })
	await db.schema.createTable('filter_owners', (table) => {
		table.integer('id').primary()
		table.string('name')
	})
	await db.schema.createTable('filter_items', (table) => {
		table.integer('id').primary()
		table.integer('owner_id')
		table.integer('price')
		table.string('status')
		table.string('title')
		table.string('description')
		table.string('expires_at')
	})
	await db('filter_owners').insert([{ id: 1, name: 'One' }, { id: 2, name: 'Two' }])
	await db('filter_items').insert(records)
	return async () => db.destroy()
})

suite('db0 SQLite', async () => {
	const db = createDatabase(sqlite({ name: ':memory:' }))
	configureDb0(db)
	await db.exec('CREATE TABLE filter_owners (id INTEGER PRIMARY KEY, name TEXT)')
	await db.exec('CREATE TABLE filter_items (id INTEGER PRIMARY KEY, owner_id INTEGER, price INTEGER, status TEXT, title TEXT, description TEXT, expires_at TEXT)')
	await db.exec("INSERT INTO filter_owners (id, name) VALUES (1, 'One'), (2, 'Two')")
	for (const record of records) {
		await db.prepare('INSERT INTO filter_items (id, owner_id, price, status, title, description, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
			.run(record.id, record.owner_id, record.price, record.status, record.title, record.description, record.expires_at)
	}
	return async () => db.dispose()
})

it('compiles MySQL predicates with bound UTC dates and escaped LIKE patterns', async () => {
	let statement = ''
	let bindings: unknown[] = []
	const db = {
		connector: 'planetscale',
		dialect: 'mysql',
		prepare: (sql: string) => ({
			all: (...values: unknown[]) => {
				statement = sql
				bindings = values
				return []
			},
		}),
	} as unknown as Database
	configureDb0(db)
	await Item.where({}).where('expires_at', '>', new Date('2026-02-01T03:00:00+03:00'))
		.whereLike('title', `%${escapeLike('50%_!')}%`).all()
	expect(statement).toContain("ESCAPE '!'")
	expect(bindings).toContain('2026-02-01 00:00:00.000')
	expect(bindings).toContain('%50!%!_!!%')
})

it('keeps equality queries valid on legacy backends without the optional filter capability', async () => {
	let equalityCalls = 0
	const query: TableQuery = {
		where() { equalityCalls++; return this },
		orderBy() { return this },
		limit() { return this },
		offset() { return this },
		clone() { return this },
		async select() { return [] },
		async first() { return null },
		async count() { return 0 },
		async insert() { return 0 },
		async update() { return 0 },
		async delete() { return 0 },
	}
	setBackend({ query: () => query })
	expect(await Item.where({ owner_id: 1 }).all()).toEqual([])
	expect(equalityCalls).toBe(1)
	expect(() => Item.where({}).whereIn('status', ['available'])).toThrow('This backend does not support extended filters')
	expect(equalityCalls).toBe(2)
})
