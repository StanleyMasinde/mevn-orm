# Migrations

Migrations are programmatic and use Knex’s migration API under the hood. Configure a directory once, then generate and run migrations from code or npm scripts.

For Nuxt/Nitro with a db0 runtime connection, use the same helpers in a [standalone Knex CLI or a Node startup plugin](/guide/db0-migrations) pointed at the same database.

## Setup

```ts
import {
  configureDatabase,
  setMigrationConfig
} from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})

setMigrationConfig({
  directory: './migrations',
  extension: 'ts' // or 'js'
})
```

`setMigrationConfig` stores defaults used by all migration helpers. Pass a per-call config object to override.

## Programmatic API

```ts
import {
  makeMigration,
  migrateLatest,
  migrateRollback,
  migrateList,
  migrateCurrentVersion
} from 'mevn-orm'

// Create a new migration file
const path = await makeMigration('create_users_table')
console.log('Wrote', path)

// Run pending migrations
const latest = await migrateLatest()
// { batch: 1, log: ['20260101120000_create_users_table.ts'] }

// Inspect
const { completed, pending } = await migrateList()
const version = await migrateCurrentVersion() // filename or 'none'

// Roll back last batch
await migrateRollback()

// Roll back all batches
await migrateRollback(undefined, true)
```

### Override directory for one call

```ts
await migrateLatest({ directory: './server/assets/migrations' })
```

## Writing a migration

Generated files follow Knex’s shape:

```js
/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.string('email').notNullable().unique()
    table.string('password').notNullable()
    table.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('users')
}
```

TypeScript example:

```ts
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary()
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
    table.string('title').notNullable()
    table.text('body')
    table.boolean('published').notNullable().defaultTo(false)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posts')
}
```

### Multi-table migration

```ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('farmers', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.string('email').notNullable().unique()
    table.string('password').notNullable()
  })

  await knex.schema.createTable('profiles', (table) => {
    table.increments('id').primary()
    table.integer('farmer_id').unsigned().notNullable()
      .references('id').inTable('farmers').onDelete('CASCADE')
    table.text('bio')
  })

  await knex.schema.createTable('farms', (table) => {
    table.increments('id').primary()
    table.integer('farmer_id').unsigned().notNullable()
      .references('id').inTable('farmers').onDelete('CASCADE')
    table.string('name').notNullable()
    table.string('region')
    table.boolean('active').defaultTo(true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('farms')
  await knex.schema.dropTableIfExists('profiles')
  await knex.schema.dropTableIfExists('farmers')
}
```

## Repository CLI scripts

This package ships npm scripts that wrap the helpers (no `knexfile` required when env/config is set):

::: code-group

```sh [npm]
npm run migrate
npm run migrate:make -- create_users_table
npm run migrate:rollback
npm run migrate:list
npm run migrate:version
```

```sh [pnpm]
pnpm run migrate
pnpm migrate:make create_users_table
pnpm run migrate:rollback
pnpm run migrate:list
pnpm run migrate:version
```

```sh [yarn]
yarn migrate
yarn migrate:make create_users_table
yarn migrate:rollback
yarn migrate:list
yarn migrate:version
```

```sh [bun]
bun run migrate
bun run migrate:make create_users_table
bun run migrate:rollback
bun run migrate:list
bun run migrate:version
```

:::

Typical `package.json` entries in an app:

```json
{
  "scripts": {
    "migrate": "node --import tsx ./scripts/migrate.ts latest",
    "migrate:make": "node --import tsx ./scripts/migrate.ts make",
    "migrate:rollback": "node --import tsx ./scripts/migrate.ts rollback"
  }
}
```

## Boot-time migrations (apps)

Running `migrateLatest()` at process start is fine: Knex returns an empty log when no migrations are pending. See [Nuxt / Nitro migrations](/guide/db0-migrations#migrate-when-a-node-server-boots) for a startup plugin and a build step that copies migration files into `.output`.

```ts
await migrateLatest()
```

## Next steps

- [Nuxt / Nitro](/guide/nuxt)
- [API: Migrations](/api/migrations)
