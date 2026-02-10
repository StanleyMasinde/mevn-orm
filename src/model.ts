import type { Knex } from 'knex'
import pluralize from 'pluralize'
import { getDB } from './config.js'
import { createRelationshipMethods } from './relationships.js'

type Row = Record<string, unknown>

const toError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error
	}

	return new Error(String(error))
}

class Model {
	[key: string]: unknown

	#private: string[]

	static currentTable: string = pluralize(this.name.toLowerCase())
	// `where()` stores a static scoped query consumed by `first()`.
	static currentQuery: Knex.QueryBuilder<Row, Row[]> | undefined

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
		this.modelName = this.constructor.name.toLowerCase()
		this.table = pluralize(this.constructor.name.toLowerCase())
	}

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

	static async update(properties: Row): Promise<number | undefined> {
		try {
			const table = pluralize(this.name.toLowerCase())
			const query = this.currentQuery ?? getDB()(table)
			return await query.update(properties)
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	static async destroy(): Promise<number | undefined> {
		try {
			const table = pluralize(this.name.toLowerCase())
			const query = this.currentQuery ?? getDB()(table)
			return await query.delete()
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	static async find(this: typeof Model, id: number | string, columns: string | string[] = '*'): Promise<Model | null> {
		const table = pluralize(this.name.toLowerCase())

		try {
			const fields = await getDB()(table).where({ id }).first<Row>(columns as never)
			return fields ? new this(fields) : null
		} catch (error) {
			throw toError(error)
		}
	}

	static async create(this: typeof Model, properties: Row): Promise<Model> {
		const table = pluralize(this.name.toLowerCase())

		try {
			const inserted = await getDB()(table).insert(properties)
			const idValue = Array.isArray(inserted) ? inserted[0] : inserted
			const id = typeof idValue === 'bigint' ? Number(idValue) : Number(idValue)
			const record = await getDB()(table).where({ id }).first<Row>()

			if (!record) {
				throw new Error(`Failed to load created record for table "${table}"`)
			}

			const model = new this(record)
			return model.stripColumns(model)
		} catch (error) {
			throw toError(error)
		}
	}

	static where(this: typeof Model, conditions: Row = {}): typeof Model {
		const table = pluralize(this.name.toLowerCase())
		this.currentQuery = getDB()(table).where(conditions) as Knex.QueryBuilder<Row, Row[]>
		return this
	}

	static async first(this: typeof Model, columns: string | string[] = '*'): Promise<Model | null> {
		try {
			const table = pluralize(this.name.toLowerCase())
			const query = this.currentQuery ?? getDB()(table)
			const rows = await query.first<Row>(columns as never)
			return rows ? new this(rows) : null
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	stripColumns<T extends Model>(model: T, keepInternalState = false): T {
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
	hasOne(
		Related: typeof Model,
		localKey?: number | string,
		foreignKey?: string,
	): Promise<Model | null>
}

Object.assign(Model.prototype, createRelationshipMethods(getDB) as Pick<Model, 'hasOne'>)

export { Model }
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
