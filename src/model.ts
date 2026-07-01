import type { Knex } from 'knex'
import { getDB } from './config.js'
import { getTableName, toSnakeCase } from './inflect.js'
import { BelongsToRelation, HasManyRelation, HasOneRelation } from './relation.js'
import { createRelationshipMethods } from './relationships.js'

type Row = Record<string, unknown>

interface PaginatedResult<T extends Model> {
	data: ModelCollection<T>
	total: number
	per_page: number
	current_page: number
	next_page: number | null
	prev_page: number | null
	last_page: number
}

const DEFAULT_PER_PAGE = 15

class ModelCollection<T extends Model> extends Array<T> {
	/** Serialises each model in the collection to a plain object. */
	toArray(): Row[] {
		return this.map((model) => model.toArray())
	}
}

const toError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error
	}

	return new Error(String(error))
}

class Model {
	[key: string]: any

	#private: string[]

	static get currentTable(): string {
		return this.resolveTable()
	}

	// `where()` stores a static scoped query consumed by `first()`.
	static currentQuery: Knex.QueryBuilder<Row, Row[]> | undefined

	/** Resolves the table name for this model, honouring subclass `table` overrides. */
	static resolveTable(this: typeof Model): string {
		return new this().table
	}

	/** Returns the active scoped query, initialising one against the model table when absent. */
	static ensureCurrentQuery(this: typeof Model): Knex.QueryBuilder<Row, Row[]> {
		if (!this.currentQuery) {
			const table = this.resolveTable()
			this.currentQuery = getDB()(table) as Knex.QueryBuilder<Row, Row[]>
		}

		return this.currentQuery
	}

	fillable: string[]
	hidden: string[]
	modelName: string
	table: string
	id?: number

	constructor(properties: Row = {}) {
		Object.assign(this, properties)
		this.fillable = []
		this.hidden = []
		this.#private = ['fillable', 'hidden']
		this.modelName = toSnakeCase(this.constructor.name)
		this.table = getTableName(this.constructor.name)
	}

	/** Inserts the current model using `fillable` attributes and reloads it from the database. */
	async save(): Promise<this> {
		try {
			const rows: Row = {}
			for (const field of this.fillable) {
				rows[field] = this[field]
			}

			const inserted = await getDB()(this.table).insert(rows)
			const idValue = Array.isArray(inserted) ? inserted[0] : inserted
			const id = typeof idValue === 'bigint' ? Number(idValue) : Number(idValue)
			const fields = await getDB()(this.table).where({ id }).first<Row>()

			if (!fields) {
				throw new Error(`Failed to load inserted record for table "${this.table}"`)
			}

			Object.assign(this, fields)
			this.id = id
			return this.stripColumns(this, true)
		} catch (error) {
			throw toError(error)
		}
	}

	/** Updates the current row by primary key and returns a refreshed model instance. */
	async update(properties: Row): Promise<this> {
		if (this.id === undefined) {
			throw new Error('Cannot update model without id')
		}

		try {
			await getDB()(this.table).where({ id: this.id }).update(properties)
			const fields = await getDB()(this.table).where({ id: this.id }).first<Row>()

			if (!fields) {
				throw new Error(`Failed to load updated record for table "${this.table}"`)
			}

			const next = new (this.constructor as new (props: Row) => this)(fields)
			return this.stripColumns(next)
		} catch (error) {
			throw toError(error)
		}
	}

	/** Deletes the current row by primary key. */
	async delete(): Promise<void> {
		if (this.id === undefined) {
			throw new Error('Cannot delete model without id')
		}

		try {
			await getDB()(this.table).where({ id: this.id }).del()
		} catch (error) {
			throw toError(error)
		}
	}

	/** Updates rows in the model table, optionally scoped by `where()`. */
	static async update(properties: Row): Promise<number | undefined> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			return await query.update(properties)
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Deletes rows in the model table, optionally scoped by `where()`. */
	static async destroy(): Promise<number | undefined> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			return await query.delete()
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Finds a single model by primary key. */
	static async find<T extends typeof Model>(this: T, id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		const table = this.resolveTable()

		try {
			const fields = await getDB()(table).where({ id }).first<Row>(columns as never)
			return fields ? new this(fields) as InstanceType<T> : null
		} catch (error) {
			throw toError(error)
		}
	}

	/** Finds a model by primary key or throws if it does not exist. */
	static async findOrFail<T extends typeof Model>(this: T, id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T>> {
		const found = await this.find(id, columns)
		if (!found) {
			throw new Error(`${this.name} with id "${id}" not found`)
		}

		return found
	}

	/** Creates and returns a single model record. */
	static async create<T extends typeof Model>(this: T, properties: Row): Promise<InstanceType<T>> {
		const table = this.resolveTable()

		try {
			const inserted = await getDB()(table).insert(properties)
			const idValue = Array.isArray(inserted) ? inserted[0] : inserted
			const id = typeof idValue === 'bigint' ? Number(idValue) : Number(idValue)
			const record = await getDB()(table).where({ id }).first<Row>()

			if (!record) {
				throw new Error(`Failed to load created record for table "${table}"`)
			}

			const model = new this(record) as InstanceType<T>
			return model.stripColumns(model)
		} catch (error) {
			throw toError(error)
		}
	}

	/** Creates multiple model records and returns created model instances. */
	static async createMany<T extends typeof Model>(this: T, properties: Row[]): Promise<InstanceType<T>[]> {
		if (properties.length === 0) {
			return []
		}

		try {
			const records: InstanceType<T>[] = []
			for (const property of properties) {
				records.push(await this.create(property))
			}
			return records
		} catch (error) {
			throw toError(error)
		}
	}

	/** Returns the first matching row or creates it with merged values when missing. */
	static async firstOrCreate<T extends typeof Model>(this: T, attributes: Row, values: Row = {}): Promise<InstanceType<T>> {
		const table = this.resolveTable()
		try {
			const record = await getDB()(table).where(attributes).first<Row>()
			if (record) {
				const model = new this(record) as InstanceType<T>
				return model.stripColumns(model)
			}

			return this.create({ ...attributes, ...values })
		} catch (error) {
			throw toError(error)
		}
	}

	/** Applies a query scope used by chained static query methods. */
	static where<T extends typeof Model>(this: T, conditions: Row = {}): T {
		const table = this.resolveTable()
		this.currentQuery = getDB()(table).where(conditions) as Knex.QueryBuilder<Row, Row[]>
		return this
	}

	/** Appends an `orderBy` clause to the current scoped query. */
	static orderBy<T extends typeof Model>(this: T, column: string, direction: 'asc' | 'desc' = 'asc'): T {
		this.ensureCurrentQuery().orderBy(column, direction)
		return this
	}

	/** Appends a `limit` clause to the current scoped query. */
	static limit<T extends typeof Model>(this: T, count: number): T {
		this.ensureCurrentQuery().limit(count)
		return this
	}

	/** Appends an `offset` clause to the current scoped query. */
	static offset<T extends typeof Model>(this: T, count: number): T {
		this.ensureCurrentQuery().offset(count)
		return this
	}

	/** Returns the first model for the current scope (or table if unscoped). */
	static async first<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const rows = await query.first<Row>(columns as never)
			return rows ? new this(rows) as InstanceType<T> : null
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Returns all models for the current scope (or table if unscoped). */
	static async all<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<ModelCollection<InstanceType<T>>> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const rows = await query.select<Row[]>(columns as never)
			const collection = new ModelCollection<InstanceType<T>>()
			for (const row of rows) {
				collection.push(new this(row) as InstanceType<T>)
			}

			return collection
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Returns a paginated result set for the current scope (or table if unscoped). */
	static async paginate<T extends typeof Model>(
		this: T,
		perPage = DEFAULT_PER_PAGE,
		page = 1,
		columns: string | string[] = '*',
	): Promise<PaginatedResult<InstanceType<T>>> {
		try {
			const table = this.resolveTable()
			const baseQuery = this.currentQuery ?? getDB()(table)
			const countResult = await baseQuery.clone().count<{ count: string | number }>({ count: '*' }).first()
			const total = countResult ? Number(countResult.count) : 0
			const lastPage = Math.max(1, Math.ceil(total / perPage) || 1)
			const currentPage = Math.min(Math.max(1, page), lastPage)
			const offset = (currentPage - 1) * perPage
			const rows = await baseQuery.clone().select<Row[]>(columns as never).limit(perPage).offset(offset)
			const collection = new ModelCollection<InstanceType<T>>()

			for (const row of rows) {
				collection.push(new this(row) as InstanceType<T>)
			}

			return {
				data: collection,
				total,
				per_page: perPage,
				current_page: currentPage,
				next_page: currentPage < lastPage ? currentPage + 1 : null,
				prev_page: currentPage > 1 ? currentPage - 1 : null,
				last_page: lastPage,
			}
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Returns a row count for the current scope (or table if unscoped). */
	static async count(this: typeof Model, column = '*'): Promise<number> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const result = await query.count<{ count: string | number }>({ count: column }).first()
			if (!result) {
				return 0
			}

			return Number(result.count)
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/** Serialises the model to a plain object, excluding internal ORM state and hidden attributes. */
	toArray(): Row {
		const data: Row = {}
		const excluded = new Set([
			'fillable',
			'hidden',
			'modelName',
			'table',
			...(Array.isArray(this.hidden) ? this.hidden : []),
		])

		for (const [key, value] of Object.entries(this)) {
			if (excluded.has(key) || typeof value === 'function') {
				continue
			}

			data[key] = value
		}

		return data
	}

	/** Removes internal and hidden fields from a model instance. */
	stripColumns<T extends Record<string, unknown>>(model: T, keepInternalState = false): T {
		// Hide internal ORM fields and caller-defined hidden attributes.
		const privateKeys = keepInternalState ? [] : this.#private
		const hiddenKeys = Array.isArray(this.hidden) ? this.hidden : []
		for (const key of [...privateKeys, ...hiddenKeys]) {
			delete model[key]
		}

		return model
	}
}

interface Model {
	hasOne<T extends typeof Model>(
		Related: T,
		localKey?: number | string,
		foreignKey?: string,
	): HasOneRelation<InstanceType<T>>
	hasMany<T extends typeof Model>(
		Related: T,
		localKey?: number | string,
		foreignKey?: string,
	): HasManyRelation<InstanceType<T>>
	belongsTo<T extends typeof Model>(
		Related: T,
		foreignKey?: string,
		ownerKey?: string,
	): BelongsToRelation<InstanceType<T>>
}

Object.assign(Model.prototype, createRelationshipMethods(getDB) as Pick<Model, 'hasOne' | 'hasMany' | 'belongsTo'>)

export { Model, ModelCollection }
export type { PaginatedResult }
export { HasOneRelation, HasManyRelation, BelongsToRelation, Relation } from './relation.js'
export {
	DB,
	getDB,
	configure,
	createKnexConfig,
	configureDatabase,
	setMigrationConfig,
	getMigrationConfig,
	makeMigration,
	migrateLatest,
	migrateRollback,
	migrateCurrentVersion,
	migrateList,
} from './config.js'
