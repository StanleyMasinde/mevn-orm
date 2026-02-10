# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)
[![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)
![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

Mevn ORM is a small ActiveRecord-style ORM built on top of Knex.

It exports:
- `Model`: base class for your models
- `configureDatabase`: initialize with simple DB options by dialect
- `configure`: initialize with raw Knex config (advanced)
- migration helpers: `makeMigration`, `migrateLatest`, `migrateRollback`, `migrateList`, `migrateCurrentVersion`
- `DB`: initialized Knex instance (after `configure`)

## Status

This project is in maintenance mode. Core functionality works, but new features are limited.

## Requirements

- Node.js 20+ (ESM runtime)
- Database driver for your selected client (`mysql2`, `sqlite3`, etc.)

## Installation

```bash
npm install mevn-orm knex mysql2
```

For SQLite development/testing:

```bash
npm install sqlite3
```

## Quick Start

### 1) Configure Mevn ORM

```ts
import { configureDatabase } from 'mevn-orm'

configureDatabase({
  dialect: 'sqlite',
  filename: './dev.sqlite'
})
```

Supported dialects:
- `sqlite`, `better-sqlite3`
- `mysql`, `mysql2`
- `postgres`, `postgresql`, `pg`, `pgnative`
- `cockroachdb`, `redshift`
- `mssql`
- `oracledb`, `oracle`

Connection styles:
- `connectionString` for one-string connection setup
- field-based setup (`host`, `port`, `user`, `password`, `database`)
- sqlite file setup via `filename`

### 2) Define a model

```ts
import { Model } from 'mevn-orm'

class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
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
```

## API Reference

### Exports

- `Model`
- `configureDatabase(config): Knex`
- `createKnexConfig(config): Knex.Config`
- `configure(config: Knex.Config | Knex): Knex`
- `getDB(): Knex`
- `DB` (Knex instance once configured)
- `setMigrationConfig(config): MigrationConfig`
- `getMigrationConfig(): MigrationConfig`
- `makeMigration(name, config?): Promise<string>`
- `migrateLatest(config?): Promise<{ batch: number; log: string[] }>`
- `migrateRollback(config?, all?): Promise<{ batch: number; log: string[] }>`
- `migrateCurrentVersion(config?): Promise<string>`
- `migrateList(config?): Promise<{ completed: string[]; pending: string[] }>`

### Model instance members

- `fillable: string[]`
  - Attributes allowed through `save()`.
- `hidden: string[]`
  - Attributes removed when serializing model results.
- `table: string`
  - Inferred from class name using pluralization (for `User` -> `users`).
- `id?: number`

### Instance methods

- `save(): Promise<this>`
  - Inserts record using only `fillable` fields.
- `update(properties): Promise<this>`
  - Updates by `id`, then reloads from DB.
- `delete(): Promise<void>`
  - Deletes current row by `id`.
- `hasOne(RelatedModel, localKey?, foreignKey?): Promise<Model | null>`
  - Loads one related record.
- `hasMany(RelatedModel, localKey?, foreignKey?): Promise<Model[]>`
  - Loads related records by foreign key.
- `belongsTo(RelatedModel, foreignKey?, ownerKey?): Promise<Model | null>`
  - Loads the owning/parent record.

### Static methods

- `find(id, columns = '*'): Promise<Model | null>`
- `findOrFail(id, columns = '*'): Promise<Model>`
- `create(properties): Promise<Model>`
- `createMany(properties[]): Promise<Model[]>`
- `firstOrCreate(attributes, values = {}): Promise<Model>`
- `where(conditions = {}): typeof Model`
- `first(columns = '*'): Promise<Model | null>`
- `all(columns = '*'): Promise<Model[]>`
- `count(column = '*'): Promise<number>`
- `update(properties): Promise<number | undefined>`
- `destroy(): Promise<number | undefined>`

## Using `DB` directly

You can always drop down to Knex after configuration:

```ts
import { configureDatabase, DB } from 'mevn-orm'

configureDatabase({
  dialect: 'sqlite',
  filename: './dev.sqlite'
})
const users = await DB('users').select('*')
```

## More Configuration Examples

```ts
import { configureDatabase } from 'mevn-orm'

// MySQL / mysql2
configureDatabase({
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'secret',
  database: 'app_db'
})

// Postgres
configureDatabase({
  dialect: 'postgres',
  connectionString: process.env.DATABASE_URL
})

// MSSQL
configureDatabase({
  dialect: 'mssql',
  host: '127.0.0.1',
  user: 'sa',
  password: 'StrongPassword!',
  database: 'app_db',
  ssl: true
})
```

## Nuxt/Nitro Example

Use a server plugin to initialize the ORM once at Nitro startup.
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
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
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
    dialect: 'postgres',
    connectionString: process.env.DATABASE_URL
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
    if (!isIgnorableMigrationError(error)) {
      throw error
    }
  }

  // Optional rollback at boot (usually only for dev/preview).
  if (process.env.NITRO_ROLLBACK_ON_BOOT === 'true') {
    try {
      await migrateRollback(undefined, false)
    } catch (error) {
      if (!isIgnorableMigrationError(error)) {
        throw error
      }
    }
  }
})
```

For fully idempotent behavior across SQL dialects, write migrations with guards
(`createTableIfNotExists`, checking column existence, or raw `IF EXISTS/IF NOT EXISTS`).

`server/models/User.ts`:

```ts
import { Model } from 'mevn-orm'

export class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

`server/api/users.get.ts`:

```ts
import { User } from '../models/User'

export default defineEventHandler(async () => {
  return await User.all()
})
```

`server/api/users.post.ts`:

```ts
import { User } from '../models/User'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await User.create({
    name: body.name,
    email: body.email,
    password: body.password // hash before storing
  })
})
```

If you prefer Nuxt runtime config:

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    db: {
      dialect: 'postgres',
      connectionString: process.env.DATABASE_URL
    }
  }
})
```

## Migrations

Migrations are now programmatic and use Knex’s migration API under the hood.

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
  dialect: 'sqlite',
  filename: './dev.sqlite'
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

- Hash passwords before calling `create()` or `save()`.
- Validate and sanitize input before persisting.
- Keep `knex`, DB drivers, and Node.js versions up to date.

## Development (Repository)

```bash
pnpm install
pnpm run migrate
pnpm run test
pnpm run typecheck
```

## License

[MIT](./LICENSE)
