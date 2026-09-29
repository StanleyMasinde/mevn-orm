import knex, { type Knex } from 'knex'
import type { Database, Primitive } from 'db0'
import type { Row } from './attributes.js'
import type { Backend, TableQuery } from './backend.js'
import { setBackend } from './backend.js'
import { applyFilter, type FilterNode } from './filters.js'

type Dialect = 'sqlite' | 'mysql'

const identifier = (value: string): string => {
	if (value === '*') return value
	for (const part of value.split('.')) {
		if (part !== '*' && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
			throw new Error(`Invalid SQL identifier: ${value}`)
		}
	}
	return value
}

const bindings = (values: readonly unknown[], dialect: Dialect): Primitive[] => values.map((value) => {
	if (value === null || typeof value === 'string') return value
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'boolean') return dialect === 'sqlite' ? Number(value) : value
	if (typeof value === 'bigint') return value.toString()
	throw new Error(`Unsupported database value: ${typeof value}`)
})

const resultNumber = (result: unknown, keys: string[]): number => {
	if (result && typeof result === 'object') {
		for (const key of keys) {
			if (key in result) {
				const value = (result as Record<string, unknown>)[key]
				if (typeof value === 'number' || typeof value === 'bigint' || (typeof value === 'string' && /^-?\d+$/.test(value))) {
					const number = Number(value)
					if (Number.isSafeInteger(number)) return number
					throw new RangeError(`${key} exceeds JavaScript's safe integer range`)
				}
			}
		}
	}
	throw new Error(`db0 connector did not return ${keys.join(' or ')}`)
}

class Db0TableQuery implements TableQuery {
	private hasOrder = false
	private hasLimit = false
	private hasOffset = false

	constructor(
		private readonly db: Database,
		private readonly dialect: Dialect,
		private readonly query: Knex.QueryBuilder<Row, Row[]>,
	) {}

	where(conditions: Row): this {
		for (const column of Object.keys(conditions)) identifier(column)
		this.query.where(conditions)
		return this
	}
	filter(predicate: FilterNode): this {
		applyFilter(this.query, predicate)
		return this
	}
	orderBy(column: string, direction: 'asc' | 'desc'): this {
		this.query.orderBy(identifier(column), direction)
		this.hasOrder = true
		return this
	}
	limit(count: number): this {
		if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('limit must be a non-negative integer')
		this.query.limit(count)
		this.hasLimit = true
		return this
	}
	offset(count: number): this {
		if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('offset must be a non-negative integer')
		this.query.offset(count)
		this.hasOffset = true
		return this
	}
	clone(): TableQuery {
		const copy = new Db0TableQuery(this.db, this.dialect, this.query.clone())
		copy.hasOrder = this.hasOrder
		copy.hasLimit = this.hasLimit
		copy.hasOffset = this.hasOffset
		return copy
	}
	private async all(query: Knex.QueryBuilder): Promise<Row[]> {
		const statement = query.toSQL()
		return await this.db.prepare(statement.sql).all(...bindings(statement.bindings, this.dialect)) as Row[]
	}
	private async get(query: Knex.QueryBuilder): Promise<Row | null> {
		const statement = query.toSQL()
		return await this.db.prepare(statement.sql).get(...bindings(statement.bindings, this.dialect)) as Row | null ?? null
	}
	private async run(query: Knex.QueryBuilder): Promise<unknown> {
		const statement = query.toSQL()
		return await this.db.prepare(statement.sql).run(...bindings(statement.bindings, this.dialect))
	}
	async select(columns: string | string[] = '*'): Promise<Row[]> {
		const selected = Array.isArray(columns) ? columns : [columns]
		if (selected.length === 0) throw new Error('At least one column must be selected')
		return this.all(this.query.clone().select(selected.map(identifier)))
	}
	async first(columns: string | string[] = '*'): Promise<Row | null> {
		const selected = Array.isArray(columns) ? columns : [columns]
		if (selected.length === 0) throw new Error('At least one column must be selected')
		return this.get(this.query.clone().first(selected.map(identifier)))
	}
	async count(column = '*'): Promise<number> {
		const row = await this.get(this.query.clone().clearOrder().clear('limit').clear('offset').count({ count: identifier(column) }))
		return Number(row?.count ?? 0)
	}
	async insert(values: Row): Promise<number> {
		for (const column of Object.keys(values)) identifier(column)
		return resultNumber(await this.run(this.query.clone().insert(values)), ['lastInsertRowid', 'insertId'])
	}
	private assertSimpleMutation(): void {
		if (this.hasOrder || this.hasLimit || this.hasOffset) {
			throw new Error('orderBy, limit, and offset are not supported on db0 update/delete queries')
		}
	}
	async update(values: Row): Promise<number> {
		this.assertSimpleMutation()
		if (Object.keys(values).length === 0) throw new Error('update requires at least one column')
		for (const column of Object.keys(values)) identifier(column)
		return resultNumber(await this.run(this.query.clone().update(values)), ['changes', 'affectedRows', 'rowsAffected'])
	}
	async delete(): Promise<number> {
		this.assertSimpleMutation()
		return resultNumber(await this.run(this.query.clone().delete()), ['changes', 'affectedRows', 'rowsAffected'])
	}
}

/** Configure Mevn ORM to compile queries with Knex and execute them through db0. */
export const configureDb0 = (db: Database): Database => {
	if (db.connector === 'sqlite3') {
		throw new Error('db0 sqlite3 is not supported: its run() result omits insert IDs and change counts.')
	}
	if (db.connector === 'cloudflare-d1') {
		throw new Error('db0 Cloudflare D1 is not supported yet: D1 returns mutation metadata under result.meta.')
	}
	if (db.dialect !== 'sqlite' && db.dialect !== 'mysql') {
		throw new Error(`Unsupported db0 dialect: ${db.dialect}. Supported dialects are sqlite and mysql.`)
	}
	const dialect = db.dialect
	// No connection is configured: Knex only compiles SQL; db0 owns execution.
	const compiler = knex({ client: dialect === 'mysql' ? 'mysql2' : 'sqlite3', useNullAsDefault: dialect === 'sqlite' })
	const backend: Backend = {
		query: (table) => new Db0TableQuery(db, dialect, compiler<Row>(identifier(table))),
	}
	setBackend(backend)
	return db
}
