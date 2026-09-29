# API Overview

All public exports from the main `mevn-orm` entry point are listed below. Import `configureDb0` from `mevn-orm/db0` when using a db0 connection.

```ts
import {
  Model,
  ModelCollection,
  ModelQuery,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  Relation,
  configureDatabase,
  createKnexConfig,
  configure,
  getDB,
  DB,
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
} from 'mevn-orm'

import type {
  PaginatedResult,
  RelationPaginatedResult,
  ModelAttributes,
  CreateAttributes,
  WhereAttributes,
  UpdateAttributes,
  AttributeColumn,
  ComparisonOperator,
} from 'mevn-orm'
```

## Models & collections

| Export | Description |
| --- | --- |
| [`Model`](/api/model) | ActiveRecord base class |
| `ModelCollection` | `Array` subclass from `all()` / `paginate().data` with `toArray()` |
| `ModelQuery` | Independent fluent query returned by `where`, `orderBy`, `limit`, or `offset` |
| `PaginatedResult` | Type for pagination results |
| `ModelAttributes` / `CreateAttributes` / `WhereAttributes` / `UpdateAttributes` | Inferred column payload types (see [Model](/api/model#attribute-helper-types)) |
| `AttributeColumn` | Declared model column names used by query methods |
| `ComparisonOperator` | Operators accepted by comparison filters (see [Queries](/guide/queries#extended-filters)) |
| [`joinRows`](/api/joins) | Start a read-only join query returning projected plain rows |
| [`JoinQuery`](/api/joins) | Fluent builder for joined-row filters, sorting, projection, count, and pagination |

## Configuration

| Export | Description |
| --- | --- |
| [`configureDatabase`](/api/configuration#configuredatabase) | Initialise from simple options (recommended) |
| [`createKnexConfig`](/api/configuration#createknexconfig) | Build Knex config without initialising |
| [`configure`](/api/configuration#configure) | Initialise from Knex config or instance |
| [`getDB`](/api/configuration#getdb) | Active Knex instance (throws if unconfigured) |
| `DB` | Knex instance export (available after configure) |
| [`configureDb0`](/api/configuration#configuredb0) | Use an existing db0 SQLite or MySQL connection from `mevn-orm/db0` |

## Relationships

| Export | Description |
| --- | --- |
| [`HasOneRelation`](/api/relationships) | One-to-one lazy relation |
| [`HasManyRelation`](/api/relationships) | One-to-many lazy relation |
| [`BelongsToRelation`](/api/relationships) | Belongs-to lazy relation |
| `Relation` | Abstract base (Promise-like) |
| `RelationPaginatedResult` | Type for relation pagination results (see [Relationships](/api/relationships#countcolumn-paginateperpage-page-columns)) |

## Transactions

| Export | Description |
| --- | --- |
| [`transaction`](/api/transactions) | Commit or roll back a callback of bound model work |
| `TransactionContext` | Live transaction scope with `model()`, `bind()`, and nested `transaction()` |
| `TransactionModel` | Typed facade for model reads, writes, and queries |

## Migrations

| Export | Description |
| --- | --- |
| [`setMigrationConfig`](/api/migrations) | Default migrator options |
| `getMigrationConfig` | Read defaults |
| `makeMigration` | Generate a migration file |
| `migrateLatest` | Run pending migrations |
| `migrateRollback` | Roll back batch(es) |
| `migrateCurrentVersion` | Current version string |
| `migrateList` | Completed and pending filenames |

## Helpers

| Export | Description |
| --- | --- |
| [`getTableName`](/api/helpers) | Pluralised snake_case table name from a class name |
| [`toSnakeCase`](/api/helpers) | PascalCase / camelCase → snake_case |
| [`escapeLike`](/api/helpers#escapelikevalue-string-string) | Escape literal text in a SQL LIKE pattern |

## Guides

For narrative tutorials and end-to-end examples, start with the [Getting Started](/guide/getting-started) guide.
