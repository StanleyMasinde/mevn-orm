# API Overview

All public exports from `mevn-orm`.

```ts
import {
  Model,
  ModelCollection,
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
} from 'mevn-orm'

import type {
  PaginatedResult,
  ModelAttributes,
  CreateAttributes,
  WhereAttributes,
  UpdateAttributes,
  AttributeColumn,
} from 'mevn-orm'
```

## Models & collections

| Export | Description |
| --- | --- |
| [`Model`](/api/model) | ActiveRecord base class |
| `ModelCollection` | `Array` subclass from `all()` / `paginate().data` with `toArray()` |
| `PaginatedResult` | Type for pagination results |
| `ModelAttributes` / `CreateAttributes` / `WhereAttributes` / `UpdateAttributes` | Inferred column payload types (see [Model](/api/model#attribute-helper-types)) |

## Configuration

| Export | Description |
| --- | --- |
| [`configureDatabase`](/api/configuration#configuredatabase) | Initialise from simple options (recommended) |
| [`createKnexConfig`](/api/configuration#createknexconfig) | Build Knex config without initialising |
| [`configure`](/api/configuration#configure) | Initialise from Knex config or instance |
| [`getDB`](/api/configuration#getdb) | Active Knex instance (throws if unconfigured) |
| `DB` | Knex instance export (available after configure) |

## Relationships

| Export | Description |
| --- | --- |
| [`HasOneRelation`](/api/relationships) | One-to-one lazy relation |
| [`HasManyRelation`](/api/relationships) | One-to-many lazy relation |
| [`BelongsToRelation`](/api/relationships) | Belongs-to lazy relation |
| `Relation` | Abstract base (Promise-like) |

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

## Guides

For narrative tutorials and end-to-end examples, start with the [Getting Started](/guide/getting-started) guide.
