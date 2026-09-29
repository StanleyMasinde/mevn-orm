import type { Knex } from 'knex'
import type { Row } from './attributes.js'
import type { Backend, TableQuery } from './backend.js'
import { applyFilter, type FilterNode } from './filters.js'

class KnexTableQuery implements TableQuery {
	constructor(
		private readonly query: Knex.QueryBuilder<Row, Row[]>,
		private readonly transactionBound: boolean,
		private readonly lockSupported: boolean,
	) {}

	where(conditions: Row): this {
		this.query.where(conditions)
		return this
	}
	filter(predicate: FilterNode): this {
		applyFilter(this.query, predicate)
		return this
	}
	lock(mode: 'update' | 'share'): this {
		if (!this.transactionBound) throw new Error('Row locking requires a transaction')
		if (!this.lockSupported) throw new Error('Row locking is not supported by this database dialect')
		if (mode === 'update') this.query.forUpdate()
		else this.query.forShare()
		return this
	}
	orderBy(column: string, direction: 'asc' | 'desc'): this {
		this.query.orderBy(column, direction)
		return this
	}
	limit(count: number): this {
		this.query.limit(count)
		return this
	}
	offset(count: number): this {
		this.query.offset(count)
		return this
	}
	clone(): TableQuery {
		return new KnexTableQuery(this.query.clone(), this.transactionBound, this.lockSupported)
	}
	async select(columns: string | string[] = '*'): Promise<Row[]> {
		return this.query.clone().select<Row[]>(columns as never)
	}
	async first(columns: string | string[] = '*'): Promise<Row | null> {
		return await this.query.clone().first<Row>(columns as never) ?? null
	}
	async count(column = '*'): Promise<number> {
		const result = await this.query.clone().clearOrder().clear('limit').clear('offset').count<{ count: string | number }>({ count: column }).first()
		return Number(result?.count ?? 0)
	}
	async insert(values: Row): Promise<number> {
		const inserted = await this.query.clone().insert(values)
		const value = Array.isArray(inserted) ? inserted[0] : inserted
		return Number(value)
	}
	async update(values: Row): Promise<number> {
		return Number(await this.query.clone().update(values))
	}
	async delete(): Promise<number> {
		return Number(await this.query.clone().delete())
	}
}

export const knexBackend = (db: Knex, transactionBound = false): Backend => {
	const dialect = String(db.client.config.client)
	const lockSupported = ['pg', 'postgres', 'postgresql', 'mysql', 'mysql2'].includes(dialect)
	return {
		query: (table) => new KnexTableQuery(db(table) as Knex.QueryBuilder<Row, Row[]>, transactionBound, lockSupported),
		transaction: async (callback) => db.transaction(async (trx) => callback(knexBackend(trx, true))),
	}
}
