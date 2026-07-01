/**
 * Mevn ORM — a small ActiveRecord-style ORM built on Knex.
 *
 * Configure the database once at startup, extend {@link Model} for your tables,
 * then use static query methods, instance persistence, relationships, and
 * migration helpers.
 *
 * @packageDocumentation
 */

import {
	Model,
	ModelCollection,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
	Relation,
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
} from './src/model.js'
import { getTableName, toSnakeCase } from './src/inflect.js'

export type { PaginatedResult } from './src/model.js'

export {
	Model,
	ModelCollection,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
	Relation,
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
	getTableName,
	toSnakeCase,
}