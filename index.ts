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
	ModelQuery,
} from './src/model.js'
import {
	DB, getDB, configure, createKnexConfig, configureDatabase,
	setMigrationConfig, getMigrationConfig, makeMigration, migrateLatest,
	migrateRollback, migrateCurrentVersion, migrateList,
} from './src/config.js'
import { getTableName, toSnakeCase } from './src/inflect.js'

export type {
	PaginatedResult,
	RelationPaginatedResult,
	ModelAttributes,
	CreateAttributes,
	WhereAttributes,
	UpdateAttributes,
	AttributeColumn,
} from './src/model.js'

export {
	Model,
	ModelCollection,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
	Relation,
	ModelQuery,
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
