# Migrations for Nuxt / Nitro

Use Mevn ORM's existing Knex migration helpers from a standalone CLI or a Nitro startup plugin. The Nitro server compiles model queries with Knex and executes them through db0; migrations open a separate Knex connection to the **same database**. No second migration framework is needed for a Node-hosted SQLite or MySQL database.

Install `knex` and the driver used by migrations (`mysql2` in this example) alongside `mevn-orm` and `db0`. Install `tsx` to load TypeScript migration and seed files. See the [copyable CLI example](https://github.com/StanleyMasinde/mevn-orm/blob/main/examples/nuxt/db.mjs) for `migration:make`, `migrate`, `rollback`, and `seed` commands.

## CLI connection

Copy `examples/nuxt/db.mjs` into the Nuxt project root as `db.mjs`. It loads `.env` beside the script when present and uses `NUXT_DATABASE_CONNECTION` to reach the same MySQL database as Nitro. This is a standalone Node process, so Nuxt's `useRuntimeConfig()` is unavailable there. The Nitro startup plugin below uses `useRuntimeConfig()`.

The CLI calls `getDB().destroy()` in `finally`, including after a failed command. Set `process.exitCode` on errors rather than calling `process.exit()` inside the `try` block, so connection shutdown still runs. Application commands such as your `create:admin` can share this configured `getDB()` or the existing `DB` export.

## Migration files

Knex migration files live under `server/assets/migrations`. A migration made with `migration:make` exports `up` and `down` functions:

```ts
// server/assets/migrations/20260929_create_users.ts
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary()
    table.string('name').notNullable()
    table.string('email').notNullable().unique()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
```

Run from the project root with `tsx` so Knex can load TypeScript migrations:

```bash
node --import tsx db.mjs migration:make --name create_users
node --import tsx db.mjs migrate
node --import tsx db.mjs rollback
node --import tsx db.mjs seed
```

In development, create and run migrations from the source tree before starting Nuxt. In CI, run `migrate` from the checked-out source in a job with database credentials, then deploy the built `.output` artifact. The CLI uses `server/assets/migrations` beside the script by default; it does not read from `.output`. `rollback` is an explicit operator command, not a server startup step.

## Migrate when a Node server boots

For a persistent Node server, copy the [startup plugin example](https://github.com/StanleyMasinde/mevn-orm/blob/main/examples/nuxt/server/plugins/mevn-orm.ts.example) to `server/plugins/mevn-orm.ts`. It configures a Knex connection from `useRuntimeConfig().databaseConnection`, runs `migrateLatest()`, then calls `configureDb0(useDatabase())` so model queries use Nitro's default connection from the [Nuxt guide](/guide/nuxt). Both connections use `NUXT_DATABASE_CONNECTION`. Use this plugin in place of the simpler connection plugin shown there.

```ts
// Inside server/plugins/mevn-orm.ts
const { databaseConnection } = useRuntimeConfig()
configureDatabase({
  client: 'mysql2',
  connection: databaseConnection
})
```

Knex treats an already applied migration as success and returns an empty log. The plugin lets migration errors fail startup; errors such as a corrupt migration directory, a duplicate table, or a missing table can indicate an incomplete or mismatched schema.

The example reads `server/assets/migrations` in development and `.output/server/assets/migrations` in production. The `compiled` hook in the [Nuxt configuration example](/guide/nuxt#configure-nitro-s-database) copies the migration files into Nitro's server output after each build:

::: code-group

```sh [npm]
npx nuxt build
```

```sh [pnpm]
pnpm exec nuxt build
```

```sh [yarn]
yarn nuxt build
```

```sh [bun]
bunx nuxt build
```

:::

```bash
NODE_ENV=production NODE_OPTIONS='--import tsx' node .output/server/index.mjs
```

If your project does not use that hook, copy `server/assets/migrations` to `.output/server/assets/migrations` as part of its build or deployment step.

TypeScript migration files require `tsx` at server startup; install it in the production environment when using this path. Start the server from the Nuxt project root for the paths above, or set `MEVN_MIGRATIONS_DIR` to an absolute directory. The plugin checks that the directory exists instead of silently starting without migrations. If CI already migrated the target database, the boot run is harmless and reports no pending migrations.

For a persistent Node server, another option is to deploy the CLI and migration files to an operations directory such as `/etc/myapp`, then run:

```bash
cd /etc/myapp
MEVN_MIGRATIONS_DIR=/etc/myapp/migrations node --import tsx db.mjs migrate
# Restart the service only after the command succeeds.
```

The CLI must also be able to resolve `mevn-orm`, Knex, the database driver, and `tsx` from that directory; copying only `db.mjs` is insufficient. This keeps migration source out of `.output` while allowing a server-side release step.

For SQLite, use a Knex `better-sqlite3` connection pointing to the **same file** as Nitro's db0 SQLite connector. The migration and runtime processes must not use separate in-memory databases.

## Cloudflare Workers

A deployed Worker has no persistent server directory or shell where `/etc/myapp/db.mjs` could run. Cloudflare's Nuxt deployment uploads the compiled `.output/server` entry point as a Worker, so run migrations **outside the Worker**, from CI or another machine with the needed credentials. [Cloudflare's Nuxt deployment guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/), [Workers filesystem documentation](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/).

- **Existing MySQL database:** the Worker may use a db0 MySQL connector through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/). Run this Knex CLI from CI or an operations host that can reach the MySQL origin directly. The Worker binding is available to the Worker, while the CLI uses `NUXT_DATABASE_CONNECTION` to reach the same database.
- **Cloudflare D1:** use [Wrangler's D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) from development or CI: `wrangler d1 migrations apply <DATABASE> --local` for local development and `wrangler d1 migrations apply <DATABASE> --remote` for the deployed database. These are SQL migration files managed by Wrangler; Knex's migration CLI does not manage D1. The current Mevn ORM db0 adapter rejects D1 because D1 reports insert IDs and affected rows under `result.meta`; D1 runtime support requires a separate adapter update. [D1 result format](https://developers.cloudflare.com/d1/worker-api/return-object/).
