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
import { escapeLike } from './src/filters.js'
import { transaction, TransactionContext, TransactionModel } from './src/transaction.js'
import { joinRows, JoinQuery } from './src/join.js'
import { manyToMany, ManyToManyRelation } from './src/many-to-many.js'

export type { ManyToManyEntry, ManyToManyOptions } from './src/many-to-many.js'

export type {
	PaginatedResult,
	RelationPaginatedResult,
	ModelAttributes,
	CreateAttributes,
	WhereAttributes,
	UpdateAttributes,
	AttributeColumn,
	ComparisonOperator,
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
	escapeLike,
	transaction,
	TransactionContext,
	TransactionModel,
	joinRows,
	JoinQuery,
	manyToMany,
	ManyToManyRelation,
}
