import { afterAll, describe, expect, it } from 'vitest'
import knex, { type Knex } from 'knex'
import { createDatabase, type Database } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { Model, configure, manyToMany } from '../index.js'
import { configureDb0 } from '../db0.js'
import { getBackend, setBackend } from '../src/backend.js'

class Farmer extends Model {
	override table = 'm2m_farmers'
	declare code: string
	declare name: string

	farms() {
		return manyToMany(this, Farm, {
			table: 'm2m_farmer_farms', parentKey: 'farmer_code', relatedKey: 'farm_code',
			parentColumn: 'code', relatedColumn: 'code', pivot: ['rate', 'position'] as const,
		}).typedPivot<{ rate: number, position: number }>().orderBy('name')
	}
}
class Farm extends Model {
	override table = 'm2m_farms'
	override hidden = ['secret']
	declare code: string
	declare name: string
	declare secret: string
}
class CollatedFarm extends Model {
	override table = 'm2m_collated_farms'
	declare code: string
	declare name: string
}
class CollatedFarmer extends Model {
	override table = 'm2m_collated_farmers'
	declare code: string
	farms() {
		return manyToMany(this, CollatedFarm, {
			table: 'm2m_collated_links', parentKey: 'farmer_code', relatedKey: 'farm_code',
			parentColumn: 'code', relatedColumn: 'code', pivot: ['rate'] as const,
		}).typedPivot<{ rate: number }>()
	}
}
class Post extends Model {
	override table = 'm2m_posts'
	declare title: string
}
class Comment extends Model {
	override table = 'm2m_comments'
	post() {
		return manyToMany(this, Post, {
			table: 'm2m_comment_posts',
			discriminator: { column: 'comment_type', value: 'comment' },
			pivot: ['position'] as const,
		}).typedPivot<{ position: number }>()
	}
}
class InvalidComment extends Model {
	post() {
		return manyToMany(this, Post, { table: 'bad;name', pivot: [] })
	}
}
class SelfComment extends Model {
	comments() {
		return manyToMany(this, SelfComment, { table: 'm2m_comment_posts', pivot: [] })
	}
}

const db0Db = createDatabase(sqlite({ name: ':memory:' }))
afterAll(async () => db0Db.dispose())

for (const backend of ['knex', 'db0'] as const) {
	describe(`${backend} many-to-many reads`, () => {
		let knexDb: Knex | undefined
		afterAll(async () => { await knexDb?.destroy() })
		const configureBackend = () => backend === 'knex'
			? configure(knexDb ??= knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true }))
			: configureDb0(db0Db)

		it('creates association tables', async () => {
			if (backend === 'knex') {
				const db = configureBackend() as Knex
				await db.schema.createTable('m2m_farmers', (t) => { t.string('code'); t.string('name') })
				await db.schema.createTable('m2m_farms', (t) => { t.string('code'); t.string('name'); t.string('secret') })
				await db.schema.createTable('m2m_farmer_farms', (t) => { t.string('farmer_code'); t.string('farm_code'); t.integer('rate'); t.integer('position') })
				await db.schema.createTable('m2m_comments', (t) => { t.integer('id'); t.string('body') })
				await db.schema.createTable('m2m_posts', (t) => { t.integer('id'); t.string('title') })
				await db.schema.createTable('m2m_comment_posts', (t) => { t.integer('comment_id'); t.integer('post_id'); t.string('comment_type'); t.integer('position') })
				await db('m2m_farmers').insert([{ code: 'A', name: 'Amina' }, { code: 'B', name: 'Ben' }, { code: 'C', name: 'Cara' }])
				await db('m2m_farms').insert([{ code: 'X', name: 'Sunrise', secret: 'private' }, { code: 'Y', name: 'Valley', secret: 'private' }])
				await db('m2m_farmer_farms').insert([
					{ farmer_code: 'A', farm_code: 'X', rate: 12, position: 2 },
					{ farmer_code: 'A', farm_code: 'Y', rate: 8, position: 1 },
					{ farmer_code: 'A', farm_code: 'X', rate: 15, position: 3 },
					{ farmer_code: 'B', farm_code: 'X', rate: 99, position: 1 },
				])
				await db('m2m_comments').insert({ id: 1, body: 'Useful' })
				await db('m2m_posts').insert([{ id: 10, title: 'First' }, { id: 20, title: 'Second' }])
				await db('m2m_comment_posts').insert([
					{ comment_id: 1, post_id: 10, comment_type: 'comment', position: 1 },
					{ comment_id: 1, post_id: 20, comment_type: 'comment', position: 2 },
					{ comment_id: 1, post_id: 10, comment_type: 'photo', position: 99 },
				])
			} else {
				configureBackend()
				await db0Db.exec('CREATE TABLE m2m_farmers (code TEXT, name TEXT)')
				await db0Db.exec('CREATE TABLE m2m_farms (code TEXT, name TEXT, secret TEXT)')
				await db0Db.exec('CREATE TABLE m2m_farmer_farms (farmer_code TEXT, farm_code TEXT, rate INTEGER, position INTEGER)')
				await db0Db.exec('CREATE TABLE m2m_comments (id INTEGER, body TEXT)')
				await db0Db.exec('CREATE TABLE m2m_posts (id INTEGER, title TEXT)')
				await db0Db.exec('CREATE TABLE m2m_comment_posts (comment_id INTEGER, post_id INTEGER, comment_type TEXT, position INTEGER)')
				await db0Db.exec("INSERT INTO m2m_farmers VALUES ('A', 'Amina'), ('B', 'Ben'), ('C', 'Cara')")
				await db0Db.exec("INSERT INTO m2m_farms VALUES ('X', 'Sunrise', 'private'), ('Y', 'Valley', 'private')")
				await db0Db.exec("INSERT INTO m2m_farmer_farms VALUES ('A', 'X', 12, 2), ('A', 'Y', 8, 1), ('A', 'X', 15, 3), ('B', 'X', 99, 1)")
				await db0Db.exec("INSERT INTO m2m_comments VALUES (1, 'Useful')")
				await db0Db.exec("INSERT INTO m2m_posts VALUES (10, 'First'), (20, 'Second')")
				await db0Db.exec("INSERT INTO m2m_comment_posts VALUES (1, 10, 'comment', 1), (1, 20, 'comment', 2), (1, 10, 'photo', 99)")
			}
		})

		it('keeps each association and pivot distinct with one query', async () => {
			configureBackend()
			const amina = new Farmer({ code: 'A', name: 'Amina' })
			const ben = new Farmer({ code: 'B', name: 'Ben' })
			let selects = 0
			const listener = () => { selects++ }
			if (backend === 'knex') knexDb!.on('query', listener)
			const a = await amina.farms().get(['name'])
			if (backend === 'knex') knexDb!.off('query', listener)
			expect(a.map((entry) => [entry.related.name, entry.pivot.rate, entry.pivot.position])).toEqual([
				['Sunrise', 12, 2], ['Sunrise', 15, 3], ['Valley', 8, 1],
			])
			expect(a.every((entry) => entry.related instanceof Farm && !('code' in entry.related) && !('secret' in entry.related))).toBe(true)
			if (backend === 'knex') expect(selects).toBe(1)
			const b = await ben.farms().get()
			expect(b).toHaveLength(1)
			expect(b[0]?.pivot.rate).toBe(99)
			expect(b[0]?.related.name).toBe('Sunrise')
			expect('secret' in b[0]!.related).toBe(false)
			expect(a[0]?.related).not.toBe(a[1]?.related)
		})

		it('matches junction and related text using database collation', async () => {
			configureBackend()
			if (backend === 'knex') {
				await knexDb!.raw('CREATE TABLE m2m_collated_farmers (code TEXT)')
				await knexDb!.raw('CREATE TABLE m2m_collated_farms (code TEXT COLLATE NOCASE, name TEXT)')
				await knexDb!.raw('CREATE TABLE m2m_collated_links (farmer_code TEXT, farm_code TEXT, rate INTEGER)')
				await knexDb!('m2m_collated_farmers').insert({ code: 'A' })
				await knexDb!('m2m_collated_farms').insert({ code: 'abc', name: 'Mixed case' })
				await knexDb!('m2m_collated_links').insert([{ farmer_code: 'A', farm_code: 'ABC', rate: 1 }, { farmer_code: 'A', farm_code: 'abc', rate: 2 }])
			} else {
				await db0Db.exec('CREATE TABLE m2m_collated_farmers (code TEXT)')
				await db0Db.exec('CREATE TABLE m2m_collated_farms (code TEXT COLLATE NOCASE, name TEXT)')
				await db0Db.exec('CREATE TABLE m2m_collated_links (farmer_code TEXT, farm_code TEXT, rate INTEGER)')
				await db0Db.exec("INSERT INTO m2m_collated_farmers VALUES ('A')")
				await db0Db.exec("INSERT INTO m2m_collated_farms VALUES ('abc', 'Mixed case')")
				await db0Db.exec("INSERT INTO m2m_collated_links VALUES ('A', 'ABC', 1), ('A', 'abc', 2)")
			}
			const entries = await new CollatedFarmer({ code: 'A' }).farms().get(['name'])
			expect(entries.map(({ related, pivot }) => [related.name, pivot.rate])).toEqual([['Mixed case', 1], ['Mixed case', 2]])
		})

		it('returns empty results and rejects invalid model relation declarations', async () => {
			configureBackend()
			expect(await new Farmer().farms().get()).toEqual([])
			expect(await new Farmer({ code: 'C' }).farms().get()).toEqual([])
			expect(await new Farmer({ code: "A' OR 1=1 --" }).farms().get()).toEqual([])
			expect(() => new InvalidComment({ id: 1 }).post()).toThrow('Invalid SQL identifier')
			expect(() => new SelfComment({ id: 1 }).comments()).toThrow('Junction keys must differ')
			expect('attach' in new Farmer({ code: 'A' }).farms()).toBe(false)
		})

		it('works as an awaitable relation defined inside a model', async () => {
			configureBackend()
			const farmer = new Farmer({ code: 'A', name: 'Amina' })
			const entries = await farmer.farms()
			expect(entries.map(({ related, pivot }) => [related.name, pivot.rate])).toEqual([
				['Sunrise', 12], ['Sunrise', 15], ['Valley', 8],
			])
			expect((await farmer.farms().get(['name']))[0]?.related.name).toBe('Sunrise')
		})

		it('loads Comment.post() with its fixed polymorphic scope', async () => {
			configureBackend()
			const comment = await Comment.findOrFail(1)
			const entries = await comment.post().orderBy('title')
			expect(entries.map(({ related, pivot }) => [related.title, pivot.position])).toEqual([
				['First', 1], ['Second', 2],
			])
			expect((await comment.post().get(['title']))[0]?.related.title).toBe('First')
		})

		it('fails clearly when a backend lacks joined rows', async () => {
			configureBackend()
			const original = getBackend()
			let selected = false
			setBackend({ query: (table) => {
				const query = original.query(table)
				return new Proxy(query, { get(target, property) {
					if (property === 'select') return () => { selected = true; return [] }
					return Reflect.get(target, property, target)
				} })
			} })
			try {
				await expect(new Farmer({ code: 'A' }).farms().get()).rejects.toThrow('joined rows required')
				expect(selected).toBe(false)
			} finally { setBackend(original) }
		})
	})
}

it('compiles db0 MySQL association reads with bound keys', async () => {
	const original = getBackend()
	const statements: { sql: string, bindings: unknown[] }[] = []
	const fakeMysql = {
		dialect: 'mysql', connector: 'mysql2',
		prepare(sql: string) {
			return { all: async (...bindings: unknown[]) => {
				statements.push({ sql, bindings })
				return [{ code: 'X', name: 'Sunrise', secret: 'private', '__mevn:pivot:0': 12, '__mevn:pivot:1': 1 }]
			} }
		},
	} as unknown as Database
	try {
		configureDb0(fakeMysql)
		const entries = await new Farmer({ code: 'A' }).farms().get()
		expect(entries[0]?.pivot.rate).toBe(12)
		expect(statements).toHaveLength(1)
		expect(statements[0]?.bindings).toEqual(['A'])
		expect(statements[0]?.sql).toContain('inner join `m2m_farms` as `related`')
		expect(statements[0]?.sql).toContain('`related`.`code` = `junction`.`farm_code`')
	} finally { setBackend(original) }
})
