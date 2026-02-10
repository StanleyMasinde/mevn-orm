import type { Knex } from 'knex'
import knexModule from 'knex'
import pluralize from 'pluralize'

type Row = Record<string, unknown>

type KnexFactory = (config: Knex.Config) => Knex

const knexFactory: KnexFactory =
	(knexModule as unknown as { knex?: KnexFactory }).knex ??
	(knexModule as unknown as KnexFactory)

const toError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error
	}

	return new Error(String(error))
}

let DB: Knex | undefined

type SimpleDialect =
	| 'sqlite'
	| 'better-sqlite3'
	| 'mysql'
	| 'mysql2'
	| 'postgres'
	| 'postgresql'
	| 'pg'
	| 'pgnative'
	| 'cockroachdb'
	| 'redshift'
	| 'mssql'
	| 'oracledb'
	| 'oracle'

interface SimpleDatabaseConfig {
	dialect: SimpleDialect
	connectionString?: string
	filename?: string
	host?: string
	port?: number
	user?: string
	password?: string
	database?: string
	ssl?: boolean | Record<string, unknown>
	debug?: boolean
	pool?: Knex.PoolConfig
}

const getDB = (): Knex => {
	if (!DB) {
		throw new Error('Mevn ORM is not configured. Call configure({ client, connection, ... }) before using Model.')
	}

	return DB
}

const configure = (config: Knex.Config | Knex): Knex => {
	if (typeof config === 'function') {
		DB = config
		return DB
	}

	DB = knexFactory(config)
	return DB
}

const normalizeDialect = (dialect: SimpleDialect): string => {
	switch (dialect) {
	case 'sqlite':
		return 'sqlite3'
	case 'mysql':
		return 'mysql2'
	case 'postgres':
	case 'postgresql':
	case 'pg':
		return 'pg'
	case 'oracle':
		return 'oracledb'
	default:
		return dialect
	}
}

const requireField = (value: unknown, field: string, dialect: string): void => {
	if (value === undefined || value === null || value === '') {
		throw new Error(`Missing required field "${field}" for dialect "${dialect}".`)
	}
}

const buildConnection = (config: SimpleDatabaseConfig): NonNullable<Knex.Config['connection']> => {
	if (config.connectionString) {
		return config.connectionString
	}

	const client = normalizeDialect(config.dialect)

	if (client === 'sqlite3' || client === 'better-sqlite3') {
		requireField(config.filename, 'filename', config.dialect)
		return { filename: config.filename as string }
	}

	if (client === 'mssql') {
		const server = config.host
		requireField(server, 'host', config.dialect)
		requireField(config.user, 'user', config.dialect)
		requireField(config.database, 'database', config.dialect)
		const connection: Record<string, unknown> = {
			server: server as string,
			user: config.user as string,
			database: config.database as string,
		}
		if (typeof config.port === 'number') {
			connection.port = config.port
		}
		if (config.password !== undefined) {
			connection.password = config.password
		}
		if (config.ssl) {
			connection.options = { encrypt: true }
		}
		return connection
	}

	requireField(config.host, 'host', config.dialect)
	requireField(config.user, 'user', config.dialect)
	requireField(config.database, 'database', config.dialect)
	const connection: Record<string, unknown> = {
		host: config.host as string,
		user: config.user as string,
		database: config.database as string,
	}
	if (typeof config.port === 'number') {
		connection.port = config.port
	}
	if (config.password !== undefined) {
		connection.password = config.password
	}
	if (config.ssl !== undefined) {
		connection.ssl = config.ssl
	}
	return connection
}

const createKnexConfig = (config: SimpleDatabaseConfig): Knex.Config => {
	const client = normalizeDialect(config.dialect)
	const base: Knex.Config = {
		client,
		connection: buildConnection(config),
	}
	if (config.pool) {
		base.pool = config.pool
	}
	if (typeof config.debug === 'boolean') {
		base.debug = config.debug
	}

	if (client === 'sqlite3') {
		base.useNullAsDefault = true
	}

	return base
}

const configureDatabase = (config: SimpleDatabaseConfig): Knex => configure(createKnexConfig(config))

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

	async hasOne(
		Related: typeof Model,
		localKey?: number | string,
		foreignKey?: string,
	): Promise<Model | null> {
		const table = new Related().table
		const relation: Row = {}
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue !== undefined) {
			relation[relationKey] = keyValue
			const result = await getDB()(table).where(relation).first<Row>()
			if (result) {
				const related = new Related(result)
				return related.stripColumns(related)
			}
		}

		return null
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

export { Model, DB, getDB, configure, createKnexConfig, configureDatabase }
