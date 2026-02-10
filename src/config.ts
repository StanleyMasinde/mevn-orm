import type { Knex } from 'knex'
import knexModule from 'knex'

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
let defaultMigrationConfig: Knex.MigratorConfig = {}

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

interface MigrationResult {
	batch: number
	log: string[]
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

const setMigrationConfig = (config: Knex.MigratorConfig): Knex.MigratorConfig => {
	defaultMigrationConfig = { ...config }
	return { ...defaultMigrationConfig }
}

const getMigrationConfig = (): Knex.MigratorConfig => ({ ...defaultMigrationConfig })

const resolveMigrationConfig = (config?: Knex.MigratorConfig): Knex.MigratorConfig => ({
	...defaultMigrationConfig,
	...(config ?? {}),
})

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

const makeMigration = async (name: string, config?: Knex.MigratorConfig): Promise<string> => {
	try {
		return await getDB().migrate.make(name, resolveMigrationConfig(config))
	} catch (error) {
		throw toError(error)
	}
}

const migrateLatest = async (config?: Knex.MigratorConfig): Promise<MigrationResult> => {
	try {
		const [batch, log] = await getDB().migrate.latest(resolveMigrationConfig(config))
		return { batch, log }
	} catch (error) {
		throw toError(error)
	}
}

const migrateRollback = async (config?: Knex.MigratorConfig, all = false): Promise<MigrationResult> => {
	try {
		const [batch, log] = all
			? await getDB().migrate.rollback(resolveMigrationConfig(config), true)
			: await getDB().migrate.rollback(resolveMigrationConfig(config))
		return { batch, log }
	} catch (error) {
		throw toError(error)
	}
}

const migrateCurrentVersion = async (config?: Knex.MigratorConfig): Promise<string> => {
	try {
		return await getDB().migrate.currentVersion(resolveMigrationConfig(config))
	} catch (error) {
		throw toError(error)
	}
}

const migrateList = async (config?: Knex.MigratorConfig): Promise<{ completed: string[]; pending: string[] }> => {
	try {
		const [completed, pending] = await getDB().migrate.list(resolveMigrationConfig(config))
		const toName = (entry: unknown): string => {
			if (typeof entry === 'string') {
				return entry
			}
			if (entry && typeof entry === 'object') {
				if ('name' in entry) {
					return String((entry as { name: unknown }).name)
				}
				if ('file' in entry) {
					return String((entry as { file: unknown }).file)
				}
			}
			return String(entry)
		}
		return {
			completed: completed.map(toName),
			pending: pending.map(toName),
		}
	} catch (error) {
		throw toError(error)
	}
}

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
}
