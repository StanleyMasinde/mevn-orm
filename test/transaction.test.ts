import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import knex, { type Knex } from 'knex'
import {
	Model,
	configureDatabase,
	transaction,
} from '../index.js'
import { configureDb0 } from '../db0.js'
import { setBackend, type Backend, type TableQuery } from '../src/backend.js'
import { knexBackend } from '../src/knex-backend.js'

class Item extends Model {
	override table = 'tx_items'
	override fillable = ['name']
	declare name: string

	notes() {
		return this.hasMany(Note, this.id, 'item_id')
	}
}

class Note extends Model {
	override table = 'tx_notes'
	override fillable = ['item_id', 'body']
	declare item_id: number
	declare body: string
}

describe('transaction-bound model operations', () => {
	let db: ReturnType<typeof configureDatabase>

	beforeAll(async () => {
		db = configureDatabase({ client: 'better-sqlite3', connection: { filename: ':memory:' } })
		await db.schema.createTable('tx_items', (table) => {
			table.increments('id')
			table.string('name')
		})
		await db.schema.createTable('tx_notes', (table) => {
			table.increments('id')
			table.integer('item_id')
			table.string('body')
		})
	})
	afterAll(async () => db.destroy())

	it('commits multi-table writes and reloads uncommitted rows through bound models', async () => {
		let committed: Item | undefined
		await transaction(async (tx) => {
			const item = await tx.model(Item).create({ name: 'Desk' })
			committed = item
			const note = await tx.model(Note).create({ item_id: item.id as number, body: 'Created' })
			expect(note.item_id).toBe(item.id)
			expect((await item.notes())[0]?.body).toBe('Created')
			const fromQuery = await tx.model(Item).where({ id: item.id as number }).firstOrFail()
			expect((await fromQuery.notes())[0]?.body).toBe('Created')
			expect((await tx.model(Item).find(item.id as number))?.name).toBe('Desk')
			expect(await tx.model(Item).where({ id: item.id as number }).count()).toBe(1)
			const updated = await item.update({ name: 'Desk v2' })
			expect(updated.name).toBe('Desk v2')
			expect((await updated.notes())[0]?.body).toBe('Created')
		})
		expect((await Item.where({ name: 'Desk v2' }).first())?.name).toBe('Desk v2')
		expect(await Note.where({ body: 'Created' }).count()).toBe(1)
		expect(committed?.toArray()).toHaveProperty('name', 'Desk')
		expect(() => committed?.notes()).toThrow('Transaction context has completed')
		await expect(committed?.update({ name: 'late' })).rejects.toThrow('Transaction context has completed')
	})

	it('rolls back writes across tables when the callback fails', async () => {
		await expect(transaction(async (tx) => {
			const item = await tx.model(Item).create({ name: 'Rollback' })
			await tx.model(Note).create({ item_id: item.id as number, body: 'Rollback note' })
			throw new Error('abort')
		})).rejects.toThrow('abort')
		expect(await Item.where({ name: 'Rollback' }).count()).toBe(0)
		expect(await Note.where({ body: 'Rollback note' }).count()).toBe(0)
	})

	it('uses a savepoint for nesting and keeps the outer context live', async () => {
		await transaction(async (outer) => {
			await outer.model(Item).create({ name: 'Outer' })
			await expect(outer.transaction(async (inner) => {
				await inner.model(Item).create({ name: 'Inner' })
				throw new Error('inner abort')
			})).rejects.toThrow('inner abort')
			expect(await outer.model(Item).where({ name: 'Outer' }).count()).toBe(1)
			expect(await outer.model(Item).where({ name: 'Inner' }).count()).toBe(0)
		})
		expect(await Item.where({ name: 'Outer' }).count()).toBe(1)
	})

	it('binds new instances and rejects row locking on SQLite before execution', async () => {
		await transaction(async (tx) => {
			const item = tx.model(Item).make({ name: 'Made' })
			await item.save()
			expect(item.id).toBeGreaterThan(0)
			await tx.model(Note).create({ item_id: item.id as number, body: 'Made note' })
			expect((await item.notes())[0]?.body).toBe('Made note')
			expect(() => tx.model(Item).where({ id: item.id as number }).forUpdate()).toThrow('Row locking is not supported')
			expect(() => tx.model(Item).where({ id: item.id as number }).forShare()).toThrow('Row locking is not supported')
		})
		expect(() => Item.where({}).forUpdate()).toThrow('Row locking requires a transaction')
	})
})

it('rejects db0 transaction entry before the callback runs', async () => {
	const db = createDatabase(sqlite({ name: ':memory:' }))
	try {
		configureDb0(db)
		let called = false
		await expect(transaction(async () => { called = true })).rejects.toThrow('This backend does not support transactions')
		expect(called).toBe(false)
	} finally {
		await db.dispose()
	}
})

it('keeps concurrent contexts and unrelated calls on their own backend', async () => {
	let next = 0
	const queryFor = (value: number): TableQuery => ({
		where() { return this },
		orderBy() { return this },
		limit() { return this },
		offset() { return this },
		clone() { return this },
		async select() { return [] },
		async first() { return null },
		async count() { return value },
		async insert() { return value },
		async update() { return value },
		async delete() { return value },
	})
	const backend: Backend = {
		query: () => queryFor(99),
		transaction: async (callback) => {
			const value = ++next
			return callback({ query: () => queryFor(value) })
		},
	}
	setBackend(backend)
	const [a, b] = await Promise.all([
		transaction(async (tx) => {
			await Promise.resolve()
			return tx.model(Item).count()
		}),
		transaction(async (tx) => {
			await Promise.resolve()
			return tx.model(Item).count()
		}),
	])
	expect([a, b]).toEqual([1, 2])
	expect(await Item.count()).toBe(99)
	await expect(transaction(async (tx) => tx.model(Item).query().forUpdate())).rejects.toThrow('This backend does not support row locking')
})

it('compiles supported MySQL row locks through Knex', async () => {
	const compiler = knex({ client: 'mysql2' })
	try {
		const update = knexBackend(compiler, true).query('tx_items')
		update.lock?.('update')
		const updateSql = (update as unknown as { query: Knex.QueryBuilder }).query.toSQL().sql
		expect(updateSql).toMatch(/for update$/i)

		const share = knexBackend(compiler, true).query('tx_items')
		share.lock?.('share')
		const shareSql = (share as unknown as { query: Knex.QueryBuilder }).query.toSQL().sql
		expect(shareSql).toMatch(/share/i)
	} finally {
		await compiler.destroy()
	}
})
