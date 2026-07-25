# Migrations API

Thin wrappers around Knex’s migrator. Configure the database first, then set default migrator options.

## `setMigrationConfig(config): Knex.MigratorConfig`

Stores default options (typically `directory` and `extension`).

```ts
import { setMigrationConfig } from 'mevn-orm'

setMigrationConfig({
  directory: './migrations',
  extension: 'ts'
})
```

Returns a **copy** of the stored config.

## `getMigrationConfig(): Knex.MigratorConfig`

Returns a copy of the current defaults.

## Shared options

Each helper accepts an optional `config?: Knex.MigratorConfig` that is merged over the defaults for that call only:

```ts
await migrateLatest({ directory: './alt-migrations' })
```

---

## `makeMigration(name, config?): Promise<string>`

Generates a migration file; returns its absolute path.

```ts
const path = await makeMigration('create_users_table')
```

## `migrateLatest(config?): Promise<{ batch: number; log: string[] }>`

Runs all pending migrations.

```ts
const { batch, log } = await migrateLatest()
```

## `migrateRollback(config?, all?): Promise<{ batch: number; log: string[] }>`

Rolls back the last batch. Pass `all: true` to roll back every completed batch.

```ts
await migrateRollback()           // last batch
await migrateRollback(undefined, true) // all
```

## `migrateCurrentVersion(config?): Promise<string>`

Latest applied migration name, or `'none'`.

```ts
const version = await migrateCurrentVersion()
```

## `migrateList(config?): Promise<{ completed: string[]; pending: string[] }>`

Filename lists for completed and pending migrations.

```ts
const { completed, pending } = await migrateList()
```

---

## Errors

Helpers rethrow as `Error` instances (wrapping non-Error throws). Ensure `configure` / `configureDatabase` ran before any migration call — otherwise `getDB()` fails first.

## Guide

See [Migrations](/guide/migrations) and [Nuxt / Nitro](/guide/nuxt).
