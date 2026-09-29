# Nuxt / Nitro with db0

Mevn ORM uses the db0 connection returned by Nitro's `useDatabase()`. Configure the connection in Nitro as usual; Mevn ORM does not replace or change `useDatabase()`. The db0 backend supports SQLite and MySQL. Install `mevn-orm`, `knex`, and `db0`; install `mysql2` when using MySQL. Knex builds SQL and bindings without opening a connection; db0 executes the compiled queries.

## Configure Nitro's database

For a MySQL app using boot migrations, configure Nitro's default connection with the same URI used by the Knex migration connection:

```ts
import { cp } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineNuxtConfig({
  runtimeConfig: {
    databaseConnection: '' // overridden by NUXT_DATABASE_CONNECTION at runtime
  },
  nitro: {
    experimental: { database: true },
    database: {
      default: {
        connector: 'mysql2',
        options: { uri: process.env.NUXT_DATABASE_CONNECTION }
      }
    },
    hooks: {
      compiled: async (nitro) => {
        await cp(
          resolve('server/assets/migrations'),
          resolve(nitro.options.output.serverDir, 'assets/migrations'),
          { recursive: true }
        )
      }
    }
  }
})
```

The `compiled` hook copies migrations into Nitro's actual server output directory after each build. Set `NUXT_DATABASE_CONNECTION` when building and running this example. Nitro resolves its `database` options from `nuxt.config.ts` during the build, while the migration plugin reads the URI from runtime config when the server starts. Changing the runtime variable alone does not change the database connection compiled into an existing `.output` build. Both must target the same database. Nitro's database feature and connection configuration vary by major version; follow the [Nitro database guide](https://v2.nitro.build/guide/database) for Nitro 2 or the [current Nitro guide](https://nitro.build/docs/database) for Nitro 3.

## Connect Mevn ORM

Configure the backend in a server plugin:

```ts
// server/plugins/mevn-orm.ts
import { configureDb0 } from 'mevn-orm/db0'

export default defineNitroPlugin(() => {
  configureDb0(useDatabase())
})
```

The database is created and cached by Nitro. For a named connection, pass `useDatabase('name')` to `configureDb0`; that argument is a **connection name**, not a table name. A standalone db0 application can pass its `createDatabase(...)` result to `configureDb0` in the same way.

```ts
import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'
import { configureDb0 } from 'mevn-orm/db0'

const db = createDatabase(sqlite({ name: 'app' }))
configureDb0(db)
```

Keep models under `server/` so client code does not import the ORM:

```ts
// server/models/User.ts
import { Model } from 'mevn-orm/db0'

export class User extends Model {
  override fillable = ['name', 'email']
}
```

```ts
// server/api/users/index.get.ts
import { User } from '../../models/User'

export default defineEventHandler(async () => {
  const page = await User.orderBy('id', 'desc').paginate(15)
  return { users: page.data.toArray(), total: page.total }
})
```

Queries hold their own state. Two requests can build `User.where(...)` chains without changing each other's filters.

The Mevn ORM query API is the same after configuration:

```ts
const user = await User.where({ email: 'jane@example.com' }).first()
```

For db0, column names must be simple SQL identifiers (`name`, `users.id`, or `*`). Values are bound as parameters. Scoped `update()` and `destroy()` support equality filters; sorting and pagination modifiers are not supported on those writes.

## Schema migrations

Mevn ORM's migration helpers remain available from `mevn-orm`. You can run them from a separate Knex CLI in development or CI, or run them when a persistent Node server boots. Both approaches use the same database as Nitro's db0 connection. See [Migrations for Nuxt / Nitro](/guide/db0-migrations) for the boot plugin, CLI, build output, and Cloudflare Workers instructions.

The db0 backend assumes integer auto-generated `id` columns. SQLite can use `id INTEGER PRIMARY KEY`; MySQL can use `id BIGINT AUTO_INCREMENT PRIMARY KEY`. Model writes return the inserted row by that ID. Use the Knex backend for other database dialects or schemas needing a different primary key strategy.

## Knex compatibility

Existing `mevn-orm` imports continue to use a Knex connection directly, including `getDB()` and migration helpers. Use one backend per server process. The `mevn-orm/db0` entry point also loads Knex for query compilation, but executes through the configured db0 connection.
