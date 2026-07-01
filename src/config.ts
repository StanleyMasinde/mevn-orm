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

/** Active Knex instance. Available after calling {@link configure} or {@link configureDatabase}. */
let DB: Knex | undefined
let defaultMigrationConfig: Knex.MigratorConfig = {}

type SupportedClient =
	| 'sqlite3'
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
	client?: SupportedClient
	dialect?: SupportedClient
	connection?: NonNullable<Knex.Config['connection']>
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

/**
 * Returns the active Knex instance.
 *
 * @returns Configured Knex client.
 * @throws When {@link configure} or {@link configureDatabase} has not been called.
 */
const getDB = (): Knex => {
	if (!DB) {
		throw new Error('Mevn ORM is not configured. Call configure({ client, connection, ... }) before using Model.')
	}

	return DB
}

/**
 * Initialises the ORM with a raw Knex config object or an existing Knex instance.
 *
 * @param config - Knex configuration or a pre-built Knex instance.
 * @returns The active Knex client (also available as {@link DB}).
 */
const configure = (config: Knex.Config | Knex): Knex => {
	if (typeof config === 'function') {
		DB = config
		return DB
	}

	DB = knexFactory(config)
	return DB
}

/**
 * Sets default migration options used by {@link makeMigration}, {@link migrateLatest},
 * and other migration helpers.
 *
 * @param config - Knex migrator config (typically `directory` and `extension`).
 * @returns A copy of the stored migration config.
 *
 * @example
 * ```ts
 * setMigrationConfig({ directory: './migrations', extension: 'ts' })
 * ```
 */
const setMigrationConfig = (config: Knex.MigratorConfig): Knex.MigratorConfig => {
	defaultMigrationConfig = { ...config }
	return { ...defaultMigrationConfig }
}

/**
 * Returns the currently configured default migration options.
 *
 * @returns Copy of the migration config set via {@link setMigrationConfig}.
 */
const getMigrationConfig = (): Knex.MigratorConfig => ({ ...defaultMigrationConfig })

const resolveMigrationConfig = (config?: Knex.MigratorConfig): Knex.MigratorConfig => ({
	...defaultMigrationConfig,
	...(config ?? {}),
})

const getConfiguredClient = (config: SimpleDatabaseConfig): SupportedClient => {
	const configuredClient = config.client ?? config.dialect
	if (!configuredClient) {
		throw new Error('Missing required field "client".')
	}

	return configuredClient
}

const normalizeClient = (client: SupportedClient): string => {
	switch (client) {
	case 'sqlite3':
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
		return client
	}
}

const requireField = (value: unknown, field: string, client: string): void => {
	if (value === undefined || value === null || value === '') {
		throw new Error(`Missing required field "${field}" for client "${client}".`)
	}
}

const buildConnection = (config: SimpleDatabaseConfig): NonNullable<Knex.Config['connection']> => {
	if (config.connection !== undefined) {
		return config.connection
	}

	if (config.connectionString) {
		return config.connectionString
	}

	const configuredClient = getConfiguredClient(config)
	const client = normalizeClient(configuredClient)

	if (client === 'sqlite3' || client === 'better-sqlite3') {
		requireField(config.filename, 'filename', configuredClient)
		return { filename: config.filename as string }
	}

	if (client === 'mssql') {
		const server = config.host
		requireField(server, 'host', configuredClient)
		requireField(config.user, 'user', configuredClient)
		requireField(config.database, 'database', configuredClient)
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

	requireField(config.host, 'host', configuredClient)
	requireField(config.user, 'user', configuredClient)
	requireField(config.database, 'database', configuredClient)
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

/**
 * Builds a Knex config from simple database options.
 *
 * Prefer `client` over the deprecated `dialect` field. Connection details can be
 * supplied as a `connection` object/string or as top-level `host`/`filename` fields.
 *
 * @param config - Simplified database configuration.
 * @returns Knex config ready for {@link configure}.
 */
const createKnexConfig = (config: SimpleDatabaseConfig): Knex.Config => {
	const client = normalizeClient(getConfiguredClient(config))
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

/**
 * Initialises the ORM from simple database options.
 *
 * This is the recommended entry point for most applications.
 *
 * @param config - Simplified database configuration with `client` and connection fields.
 * @returns The active Knex client (also available as {@link DB}).
 *
 * @example
 * ```ts
 * configureDatabase({
 *   client: 'sqlite3',
 *   connection: { filename: './dev.sqlite' }
 * })
 * ```
 */
const configureDatabase = (config: SimpleDatabaseConfig): Knex => configure(createKnexConfig(config))

/**
 * Generates a Knex migration file and returns its absolute path.
 *
 * @param name - Migration name (e.g. `create_users_table`).
 * @param config - Optional per-call migrator overrides.
 * @returns Path to the created migration file.
 */
const makeMigration = async (name: string, config?: Knex.MigratorConfig): Promise<string> => {
	try {
		return await getDB().migrate.make(name, resolveMigrationConfig(config))
	} catch (error) {
		throw toError(error)
	}
}

/**
 * Runs all pending migrations.
 *
 * @param config - Optional per-call migrator overrides.
 * @returns Batch number and filenames of migrations executed in this run.
 */
const migrateLatest = async (config?: Knex.MigratorConfig): Promise<MigrationResult> => {
	try {
		const [batch, log] = await getDB().migrate.latest(resolveMigrationConfig(config))
		return { batch, log }
	} catch (error) {
		throw toError(error)
	}
}

/**
 * Rolls back the most recent migration batch.
 *
 * @param config - Optional per-call migrator overrides.
 * @param all - When `true`, rolls back all completed batches.
 * @returns Batch number and filenames of migrations rolled back.
 */
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

/**
 * Returns the current migration version recorded by Knex.
 *
 * @param config - Optional per-call migrator overrides.
 * @returns Latest applied migration name, or `'none'` when no migrations have run.
 */
const migrateCurrentVersion = async (config?: Knex.MigratorConfig): Promise<string> => {
	try {
		return await getDB().migrate.currentVersion(resolveMigrationConfig(config))
	} catch (error) {
		throw toError(error)
	}
}

/**
 * Lists completed and pending migration filenames.
 *
 * @param config - Optional per-call migrator overrides.
 * @returns Object with `completed` and `pending` migration filename arrays.
 */
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
