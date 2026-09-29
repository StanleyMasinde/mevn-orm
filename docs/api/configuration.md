# Configuration API

## `configureDb0(db): Database`

Use a db0 SQLite or MySQL connection. Import from `mevn-orm/db0`; Knex compiles the queries and db0 executes them:

```ts
import { Model, configureDb0 } from 'mevn-orm/db0'

configureDb0(useDatabase()) // Nitro server code
class User extends Model {}
```

The connection may also come from standalone db0 `createDatabase(...)`. The `db0` package is an optional peer dependency. See the [Nuxt / Nitro guide](/guide/nuxt).

The db0 `sqlite3` connector is unsupported because its mutation results omit insert IDs and change counts. Use db0's `node-sqlite` or `better-sqlite3` connector for SQLite. PlanetScale's MySQL connector is supported.

---

## `configureDatabase(config): Knex`

Initialises the ORM from simple options. Recommended for most applications.

```ts
import { configureDatabase } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})
```

### `SimpleDatabaseConfig`

| Field | Type | Description |
| --- | --- | --- |
| `client` | string | Preferred driver selector |
| `dialect` | string | Deprecated alias of `client` |
| `connection` | Knex connection | Object or connection string |
| `connectionString` | string | Alternative to `connection` string |
| `filename` | string | SQLite path when not using `connection` |
| `host`, `port`, `user`, `password`, `database` | | Top-level connection fields |
| `ssl` | boolean \| object | Passed into connection when built from top-level fields |
| `debug` | boolean | Knex debug flag |
| `pool` | Knex pool config | Connection pool |

### Client normalisation

| Input | Resolved Knex client |
| --- | --- |
| `sqlite3`, `sqlite` | `better-sqlite3` (install `better-sqlite3`; not remapped by `configure()`) |
| `mysql` | `mysql2` |
| `postgres`, `postgresql`, `pg` | `pg` |
| `oracle` | `oracledb` |
| others listed in types | as-is |

SQLite configs set `useNullAsDefault: true`.

### Errors

- Missing `client` (and `dialect`): `Missing required field "client".`
- Missing required host/user/database/filename for the client: `Missing required field "…" for client "…".`

---

## `createKnexConfig(config): Knex.Config`

Builds a Knex config without setting the global client.

```ts
import { createKnexConfig, configure } from 'mevn-orm'

const config = createKnexConfig({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 10 }
})

configure(config)
```

---

## `configure(config: Knex.Config | Knex): Knex`

Initialises from a full Knex config **or** an existing Knex instance.

```ts
import knex from 'knex'
import { configure } from 'mevn-orm'

configure({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  searchPath: ['public']
})

const db = knex({ /* ... */ })
configure(db)
```

---

## `getDB(): Knex`

Returns the active Knex instance.

```ts
import { getDB } from 'mevn-orm'

const rows = await getDB()('users').select('*')
```

Throws if not configured:

```txt
Mevn ORM is not configured. Call configure({ client, connection, ... }) before using Model.
```

---

## `DB`

Package export for the Knex instance. Prefer `getDB()` in application code so missing configuration fails loudly with a clear error.
