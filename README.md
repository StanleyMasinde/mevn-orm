# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)
[![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)
![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

Mevn ORM is a small ActiveRecord-style ORM built on top of Knex.

It exports:
- `Model`: base class for your models
- `ModelCollection`: array subclass returned by `Model.all()` with `toArray()` support
- `configureDatabase`: initialise with simple DB options by `client`
- `configure`: initialise with raw Knex config (advanced)
- migration helpers: `makeMigration`, `migrateLatest`, `migrateRollback`, `migrateList`, `migrateCurrentVersion`
- relationship classes: `HasOneRelation`, `HasManyRelation`, `BelongsToRelation`, `Relation`
- table-name helpers: `getTableName`, `toSnakeCase`
- `DB`: initialised Knex instance (after `configure`)

## Status

This project is in maintenance mode. Core functionality is stable and actively maintained; large new features are limited.

## Requirements

- Node.js 20+ (ESM runtime)
- Database driver for your selected client (`mysql2`, `pg`, `sqlite3`, etc.)

## Installation

```bash
npm install mevn-orm knex
npm install mysql2 # or your selected Knex driver
```

For SQLite development/testing:

```bash
npm install sqlite3
# or:
npm install better-sqlite3
```

## Quick Start

### 1) Configure Mevn ORM

```ts
import { configureDatabase } from 'mevn-orm'

configureDatabase({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite'
  }
})
```

Supported clients (canonical Knex client names):

* `sqlite3`, `better-sqlite3`
* `mysql2`
* `pg` (also used for CockroachDB/Redshift via the pg driver)
* `mssql`
* `oracledb`

Connection styles:

* connection string: `connection: process.env.DATABASE_URL`
* object: `connection: { host, port, user, password, database }`
* sqlite file: `connection: { filename }`

A deprecated `dialect` field is still accepted by `configureDatabase` / `createKnexConfig` for backwards compatibility, but `client` is preferred.

### 2) Define a model

```ts
import { Model } from 'mevn-orm'

class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

Table names are inferred automatically from the class name (`User` → `users`, `PasswordResetToken` → `password_reset_tokens`). Override when your database table does not match:

```ts
class PasswordResetToken extends Model {
  override table = 'password_reset_tokens'
}
```

### 3) Use it

```ts
const created = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'hash-me-first'
})

const found = await User.find(created.id as number)
await found?.update({ name: 'Jane Updated' })

const users = await User.where({ name: 'Jane Updated' }).all()
return users.toArray() // plain objects for API responses
```

## API Reference

### Package exports

| Export | Description |
| --- | --- |
| `Model` | Base ActiveRecord model class |
| `ModelCollection` | Array subclass returned by `Model.all()` |
| `PaginatedResult` | Type for `Model.paginate()` results |
| `HasOneRelation`, `HasManyRelation`, `BelongsToRelation`, `Relation` | Relationship query wrappers |
| `configureDatabase(config)` | Initialise with a simple config object |
| `createKnexConfig(config)` | Build a Knex config without initialising |
| `configure(config)` | Initialise with raw Knex config or a Knex instance |
| `getDB()` | Returns the active Knex instance |
| `DB` | Knex instance alias (available after configure) |
| `getTableName(className)` | Pluralised snake_case table name for a model class |
| `toSnakeCase(value)` | Converts PascalCase/camelCase to snake_case |
| `setMigrationConfig(config)` | Set default migration directory/options |
| `getMigrationConfig()` | Read current migration config |
| `makeMigration(name, config?)` | Generate a migration file |
| `migrateLatest(config?)` | Run pending migrations |
| `migrateRollback(config?, all?)` | Roll back the last batch (or all) |
| `migrateCurrentVersion(config?)` | Current migration version |
| `migrateList(config?)` | List completed and pending migrations |

### Model configuration

| Property | Description |
| --- | --- |
| `fillable` | Attributes allowed through `save()` mass assignment |
| `hidden` | Attributes excluded from `toArray()` and stripped after reads |
| `table` | Override the inferred database table name |
| `id` | Primary key (set after insert/find) |
| `modelName` | Snake_case singular name derived from the class name |

### Instance methods

| Method | Description |
| --- | --- |
| `save()` | Insert using `fillable` fields and reload the record |
| `update(properties)` | Update by primary key and return a refreshed instance |
| `delete()` | Delete by primary key |
| `toArray()` | Serialise to a plain object (excludes `hidden` and ORM internals) |

### Static CRUD

| Method | Description |
| --- | --- |
| `find(id, columns?)` | Find by primary key; returns `null` when missing |
| `findOrFail(id, columns?)` | Find by primary key; throws when missing |
| `create(properties)` | Insert and return a model instance |
| `createMany(properties[])` | Insert multiple records |
| `firstOrCreate(attributes, values?)` | Find first match or create with merged values |
| `update(properties)` | Bulk update rows (optionally scoped by `where()`) |
| `destroy()` | Bulk delete rows (optionally scoped by `where()`) |

Static methods preserve the derived class type in TypeScript (`User.find()` returns `User | null`, not `Model | null`).

### Query builder

Chain scopes on the model class, then call a terminal method. The scope is reset after each terminal call.

| Chain method | Description |
| --- | --- |
| `where(conditions)` | Add a `where` clause |
| `orderBy(column, direction?)` | Sort results (`'asc'` or `'desc'`, default `'asc'`) |
| `limit(count)` | Limit rows returned |
| `offset(count)` | Skip rows (commonly paired with `limit`) |

| Terminal method | Description |
| --- | --- |
| `first(columns?)` | First matching row |
| `all(columns?)` | All matching rows as a `ModelCollection` |
| `count(column?)` | Row count for the current scope |
| `paginate(perPage?, page?, columns?)` | Paginated result with metadata |
| `update(properties)` | Update scoped rows |
| `destroy()` | Delete scoped rows |

```ts
// Sort at the database level
const leads = await Lead.orderBy('created_at', 'desc').all()

// Compose scopes
const leads = await Lead
  .where({ user_id: userId })
  .orderBy('created_at', 'desc')
  .limit(10)
  .all()

// Scoped bulk update
await User.where({ active: false }).update({ archived: true })
```

`Model.resolveTable()` and `Model.currentTable` return the resolved table name, honouring `override table` on subclasses.

### Pagination

`paginate()` defaults to 15 items per page on page 1. Pass a custom page size and page number as the first two arguments.

```ts
const result = await Post.paginate()
const result = await Post.paginate(10)
const result = await Post.where({ published: true }).orderBy('created_at', 'desc').paginate(10, 2)

// result shape:
{
  data: ModelCollection<Post>,
  total: number,
  per_page: number,
  current_page: number,
  next_page: number | null,
  prev_page: number | null,
  last_page: number,
}
```

### Serialization

Use `toArray()` to return clean data from API handlers without leaking ORM internals.

```ts
const user = await User.findOrFail(userId)
return user.toArray()
// { id: 1, name: 'Jane Doe', email: 'jane@example.com' }
// password omitted because it is listed in hidden

const users = await User.all()
return users.toArray() // array of plain objects
```

### Relationships

Define relationship methods on your model. They return lazy relation instances that can be awaited directly or chained before execution.

```ts
class Farmer extends Model {
  profile() {
    return this.hasOne(Profile)
  }

  farms() {
    return this.hasMany(Farm)
  }
}

class Farm extends Model {
  farmer() {
    return this.belongsTo(Farmer, 'farmer_id')
  }
}
```

| Method | Description |
| --- | --- |
| `hasOne(Related, localKey?, foreignKey?)` | One-to-one (`foreignKey` defaults to `{modelName}_id`) |
| `hasMany(Related, localKey?, foreignKey?)` | One-to-many |
| `belongsTo(Related, foreignKey?, ownerKey?)` | Inverse belongs-to (`ownerKey` defaults to `id`) |

```ts
const farmer = await Farmer.find(1)

// Auto-resolve (Promise-like)
const profile = await farmer.profile()
const farms = await farmer.farms()

// Chain before executing
const activeFarm = await farmer.farms().where({ active: true }).first()
const farmList = await farmer.farms().where({ region: 'west' }).get()
```

Relation instances support `where()`, `first()`, and `get()`. `HasOneRelation` and `BelongsToRelation` resolve to a single model; `HasManyRelation` resolves to an array.

## Using `DB` directly

You can always drop down to Knex after configuration:

```ts
import { configureDatabase, DB } from 'mevn-orm'

configureDatabase({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite'
  }
})

const users = await DB('users').select('*')
```

## More Configuration Examples

```ts
import { configureDatabase } from 'mevn-orm'

// MySQL / mysql2
configureDatabase({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'secret',
    database: 'app_db'
  }
})

// Postgres (connection string)
configureDatabase({
  client: 'pg',
  connection: process.env.DATABASE_URL
})

// MSSQL
configureDatabase({
  client: 'mssql',
  connection: {
    host: '127.0.0.1',
    user: 'sa',
    password: 'StrongPassword!',
    database: 'app_db',
    // MSSQL driver options live under `options` (passed through to tedious)
    options: {
      encrypt: true
    }
  }
})
```

## Nuxt/Nitro Example

Use a server plugin to initialise the ORM once at Nitro startup.
You can also run idempotent migrations (and optional rollback) during boot.

Because Nitro bundles server code, migration files must be copied into the build output.

`nuxt.config.ts`:

```ts
import { cp } from 'node:fs/promises'

export default defineNuxtConfig({
  nitro: {
    hooks: {
      compiled: async () => {
        await cp('server/assets/migrations', '.output/server/assets/migrations', {
          recursive: true
        })
      }
    }
  }
})
```

`server/plugins/mevn-orm.ts`:

```ts
import { defineNitroPlugin } from 'nitropack/runtime'
import { existsSync } from 'node:fs'
import {
  configureDatabase,
  setMigrationConfig,
  migrateLatest,
  migrateRollback
} from 'mevn-orm'

const isIgnorableMigrationError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  return (
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('does not exist') ||
    message.includes('no such table') ||
    message.includes('the migration directory is corrupt')
  )
}

export default defineNitroPlugin(async () => {
  configureDatabase({
    client: 'pg',
    connection: process.env.DATABASE_URL
  })

  // Nitro runtime path differs in dev vs built server.
  const migrationDirectory = existsSync('./.output/server/assets/migrations')
    ? './.output/server/assets/migrations'
    : './server/assets/migrations'

  setMigrationConfig({
    directory: migrationDirectory,
    extension: 'ts'
  })

  // Idempotent at boot: if already migrated, Knex returns empty log.
  try {
    await migrateLatest()
  } catch (error) {
    if (!isIgnorableMigrationError(error)) throw error
  }

  // Optional rollback at boot (usually only for dev/preview).
  if (process.env.NITRO_ROLLBACK_ON_BOOT === 'true') {
    try {
      await migrateRollback(undefined, false)
    } catch (error) {
      if (!isIgnorableMigrationError(error)) throw error
    }
  }
})
```

## Migrations

Migrations are programmatic and use Knex’s migration API under the hood.

```ts
import {
  configureDatabase,
  setMigrationConfig,
  makeMigration,
  migrateLatest,
  migrateRollback,
  migrateList
} from 'mevn-orm'

configureDatabase({
  client: 'sqlite3',
  connection: { filename: './dev.sqlite' }
})

setMigrationConfig({
  directory: './migrations',
  extension: 'ts'
})

await makeMigration('create_users_table')
await migrateLatest()
const { completed, pending } = await migrateList()
await migrateRollback(undefined, false) // rollback last batch
```

Repository migration commands (no `knexfile` required):

```bash
pnpm run migrate
pnpm run migrate:make -- create_users_table
pnpm run migrate:rollback
pnpm run migrate:list
pnpm run migrate:version
```

## Security Notes

* Hash passwords before calling `create()` or `save()`.
* Validate and sanitise input before persisting.
* Use `hidden` and `toArray()` to avoid exposing sensitive columns in API responses.
* Keep `knex`, DB drivers, and Node.js versions up to date.