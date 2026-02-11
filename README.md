# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)
[![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)
![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

Mevn ORM is a small ActiveRecord-style ORM built on top of Knex.

It exports:
- `Model`: base class for your models
- `configureDatabase`: initialise with simple DB options by `client`
- `configure`: initialise with raw Knex config (advanced)
- migration helpers: `makeMigration`, `migrateLatest`, `migrateRollback`, `migrateList`, `migrateCurrentVersion`
- `DB`: initialised Knex instance (after `configure`)

## Status

This project is in maintenance mode. Core functionality works, but new features are limited.

## Requirements

- Node.js 20+ (ESM runtime)
- Database driver for your selected client (`mysql2`, `pg`, `sqlite3`, etc.)

## Installation

```bash
npm install mevn-orm knex
npm install mysql2
````

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

* `Model`
* `configureDatabase(config): Knex`
* `createKnexConfig(config): Knex.Config`
* `configure(config: Knex.Config | Knex): Knex`
* `getDB(): Knex`
* `DB` (Knex instance once configured)
* `setMigrationConfig(config): MigrationConfig`
* `getMigrationConfig(): MigrationConfig`
* `makeMigration(name, config?): Promise<string>`
* `migrateLatest(config?): Promise<{ batch: number; log: string[] }>`
* `migrateRollback(config?, all?): Promise<{ batch: number; log: string[] }>`
* `migrateCurrentVersion(config?): Promise<string>`
* `migrateList(config?): Promise<{ completed: string[]; pending: string[] }>`

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
* Keep `knex`, DB drivers, and Node.js versions up to date.
