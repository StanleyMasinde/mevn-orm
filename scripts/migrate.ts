#!/usr/bin/env node
import {
	configureDatabase,
	setMigrationConfig,
	makeMigration,
	migrateLatest,
	migrateRollback,
	migrateList,
	migrateCurrentVersion,
} from '../index.js'

const [command = 'latest', name] = process.argv.slice(2)

const databaseConfig: Parameters<typeof configureDatabase>[0] = {
	dialect: (process.env.DB_DIALECT as
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
		| 'oracle') ?? 'sqlite',
	filename: process.env.DB_FILENAME ?? './dev.sqlite',
}

if (process.env.DATABASE_URL) {
	databaseConfig.connectionString = process.env.DATABASE_URL
}
if (process.env.DB_HOST) {
	databaseConfig.host = process.env.DB_HOST
}
if (process.env.DB_PORT) {
	databaseConfig.port = Number(process.env.DB_PORT)
}
if (process.env.DB_USER) {
	databaseConfig.user = process.env.DB_USER
}
if (process.env.DB_PASSWORD) {
	databaseConfig.password = process.env.DB_PASSWORD
}
if (process.env.DB_NAME) {
	databaseConfig.database = process.env.DB_NAME
}
if (process.env.DB_SSL === 'true') {
	databaseConfig.ssl = true
}

configureDatabase(databaseConfig)

setMigrationConfig({
	directory: process.env.MIGRATIONS_DIR ?? './migrations',
	extension: process.env.MIGRATIONS_EXT ?? 'ts',
})

const run = async (): Promise<void> => {
	switch (command) {
	case 'make': {
		if (!name) {
			throw new Error('Usage: node --import tsx scripts/migrate.ts make <name>')
		}
		const file = await makeMigration(name)
		console.log(file)
		return
	}
	case 'latest': {
		const result = await migrateLatest()
		console.log(JSON.stringify(result, null, 2))
		return
	}
	case 'rollback': {
		const all = process.argv.includes('--all')
		const result = await migrateRollback(undefined, all)
		console.log(JSON.stringify(result, null, 2))
		return
	}
	case 'list': {
		const result = await migrateList()
		console.log(JSON.stringify(result, null, 2))
		return
	}
	case 'version': {
		const version = await migrateCurrentVersion()
		console.log(version)
		return
	}
	default:
		throw new Error(`Unknown command "${command}". Use make|latest|rollback|list|version`)
	}
}

await run()
