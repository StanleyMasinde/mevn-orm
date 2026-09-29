import { afterAll, describe, expect, it } from 'vitest'
import knex from 'knex'
import { createDatabase, type Database } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { Model, configure, joinRows } from '../index.js'
import { configureDb0 } from '../db0.js'
import { getBackend, setBackend } from '../src/backend.js'

class JoinItem extends Model { override table = 'join_items' }
class JoinUser extends Model { override table = 'join_users' }
class JoinTeam extends Model { override table = 'join_teams' }

const db0Db = createDatabase(sqlite({ name: ':memory:' }))
afterAll(async () => { await db0Db.dispose() })

for (const backend of ['knex', 'db0'] as const) {
	describe(`${backend} joined rows`, () => {
		let activeKnex: ReturnType<typeof knex> | undefined
		afterAll(async () => { await activeKnex?.destroy() })
		const configureBackend = () => backend === 'knex'
			? configure(activeKnex ??= knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true }))
			: configureDb0(db0Db)

		it('returns projected three-table rows with left join ON predicates and joined-row pagination', async () => {
			// Use each backend's own SQLite connection so the test exercises execution as well as compilation.
			if (backend === 'knex') {
				const active = configureBackend() as ReturnType<typeof knex>
				await active.schema.createTable('join_teams', (t) => { t.integer('id'); t.string('name') })
				await active.schema.createTable('join_users', (t) => { t.integer('id'); t.integer('team_id'); t.string('name'); t.integer('active') })
				await active.schema.createTable('join_items', (t) => { t.integer('id'); t.integer('owner_id'); t.string('name') })
				await active('join_teams').insert([{ id: 1, name: 'Ops' }, { id: 2, name: 'Sales' }])
				await active('join_users').insert([{ id: 1, team_id: 1, name: 'Ada', active: 1 }, { id: 2, team_id: 2, name: 'Bob', active: 0 }])
				await active('join_items').insert([{ id: 1, owner_id: 1, name: 'Desk' }, { id: 2, owner_id: 2, name: 'Lamp' }, { id: 3, owner_id: 1, name: 'Chair' }])
			} else {
				configureBackend()
				await db0Db.exec('CREATE TABLE join_teams (id INTEGER, name TEXT)')
				await db0Db.exec('CREATE TABLE join_users (id INTEGER, team_id INTEGER, name TEXT, active INTEGER)')
				await db0Db.exec('CREATE TABLE join_items (id INTEGER, owner_id INTEGER, name TEXT)')
				await db0Db.exec("INSERT INTO join_teams VALUES (1, 'Ops'), (2, 'Sales')")
				await db0Db.exec("INSERT INTO join_users VALUES (1, 1, 'Ada', 1), (2, 2, 'Bob', 0)")
				await db0Db.exec("INSERT INTO join_items VALUES (1, 1, 'Desk'), (2, 2, 'Lamp'), (3, 1, 'Chair')")
			}
			const query = joinRows(JoinItem, 'i')
				.innerJoin(JoinUser, { as: 'u', on: ['i.owner_id', '=', 'u.id'] })
				.leftJoin(JoinTeam, { as: 't', on: ['u.team_id', '=', 't.id'], onWhere: { 't.name': 'Ops' } })
				.project({ itemId: 'i.id', itemName: 'i.name', ownerName: 'u.name', teamName: 't.name' })
				.orderBy('i.id')
			expect(await query.rows()).toEqual([
				{ itemId: 1, itemName: 'Desk', ownerName: 'Ada', teamName: 'Ops' },
				{ itemId: 2, itemName: 'Lamp', ownerName: 'Bob', teamName: null },
				{ itemId: 3, itemName: 'Chair', ownerName: 'Ada', teamName: 'Ops' },
			])
			expect(await query.clone().where('t.name', '=', null).count()).toBe(1)
			const page = await query.paginate(2, 2)
			expect(page.total).toBe(3)
			expect(page.data.map((row) => row.itemId)).toEqual([3])
			const owners = joinRows(JoinUser, 'u')
				.leftJoin(JoinItem, { as: 'i', on: ['u.id', '=', 'i.owner_id'] })
				.project({ userId: 'u.id', itemId: 'i.id' })
				.orderBy('u.id').orderBy('i.id')
			expect(await owners.count()).toBe(3) // Two users, three joined rows.
			expect((await owners.paginate(2)).data.map((row) => row.userId)).toEqual([1, 1])
			expect(await JoinItem.count()).toBe(3)
		})

		it('rejects invalid or duplicate aliases before execution', () => {
			configureBackend()
			expect(() => joinRows(JoinItem, 'i;DROP')).toThrow('Invalid SQL identifier')
			expect(() => joinRows(JoinItem, 'i').innerJoin(JoinUser, { as: 'i', on: ['i.owner_id', '=', 'i.id'] })).toThrow('Duplicate table alias')
			expect(() => joinRows(JoinItem, 'i').project({ 'bad name': 'i.id' })).toThrow('Invalid SQL identifier')
		})

		it('leaves older backends usable while reporting missing join support', async () => {
			configureBackend()
			const original = getBackend()
			setBackend({ query: original.query })
			try {
				expect(await JoinItem.count()).toBe(3)
				await expect(joinRows(JoinItem, 'i').project({ id: 'i.id' }).rows()).rejects.toThrow('does not support joined rows')
			} finally {
				setBackend(original)
			}
		})
	})
}

it('compiles db0 MySQL joins with quoted aliases and bound ON values', async () => {
	const original = getBackend()
	let sql = ''
	let values: unknown[] = []
	const fakeMysql = {
		dialect: 'mysql', connector: 'mysql2',
		prepare(statement: string) {
			sql = statement
			return { all: async (...bindings: unknown[]) => { values = bindings; return [] } }
		},
	} as unknown as Database
	try {
		configureDb0(fakeMysql)
		await joinRows(JoinItem, 'i')
			.leftJoin(JoinUser, { as: 'u', on: ['i.owner_id', '=', 'u.id'], onWhere: { 'u.active': true } })
			.project({ itemId: 'i.id' }).rows()
		expect(sql).toContain('left join')
		expect(sql).toContain('`u`.`active`')
		expect(values).toEqual([true])
	} finally {
		setBackend(original)
	}
})
