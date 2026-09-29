/** Mevn ORM with Knex query compilation and db0 execution. */
export { Model, ModelCollection, ModelQuery, Relation, HasOneRelation, HasManyRelation, BelongsToRelation } from './src/model.js'
export type { PaginatedResult, ModelAttributes, CreateAttributes, WhereAttributes, UpdateAttributes, AttributeColumn } from './src/model.js'
export { configureDb0 } from './src/db0-backend.js'
export { getTableName, toSnakeCase } from './src/inflect.js'
