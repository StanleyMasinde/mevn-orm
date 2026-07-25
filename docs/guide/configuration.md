# Configuration

Mevn ORM must be configured **once** before any `Model` method runs. Prefer `configureDatabase` for most apps; use `configure` when you already have a Knex config or instance.

## `configureDatabase` (recommended)

```ts
import { configureDatabase } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: {
    filename: './dev.sqlite'
  }
})
```

### Supported clients

| Input `client` | Knex driver used |
| --- | --- |
| `better-sqlite3` | `better-sqlite3` (preferred SQLite) |
| `sqlite3`, `sqlite` | `better-sqlite3` (aliases) |
| `mysql2`, `mysql` | `mysql2` |
| `pg`, `postgres`, `postgresql` | `pg` |
| `pgnative`, `cockroachdb`, `redshift` | as named / via `pg` family |
| `mssql` | `mssql` |
| `oracledb`, `oracle` | `oracledb` |

A deprecated `dialect` field is still accepted for backwards compatibility. Prefer **`client`**.

### Connection styles

#### Connection object

```ts
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
```

#### Connection string

```ts
configureDatabase({
  client: 'pg',
  connection: process.env.DATABASE_URL
})

// or via connectionString
configureDatabase({
  client: 'pg',
  connectionString: process.env.DATABASE_URL
})
```

#### SQLite file

```ts
configureDatabase({
  client: 'better-sqlite3',
  connection: {
    filename: './dev.sqlite'
  }
})

// top-level filename also works
configureDatabase({
  client: 'better-sqlite3',
  filename: './dev.sqlite'
})
```

#### Top-level host fields

```ts
configureDatabase({
  client: 'mysql2',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'secret',
  database: 'app_db'
})
```

#### MSSQL

```ts
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

#### Pool and debug

```ts
configureDatabase({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10
  },
  debug: process.env.NODE_ENV !== 'production'
})
```

SQLite configs automatically set `useNullAsDefault: true` for Knex.

## `createKnexConfig`

Build a Knex config **without** initialising the global client (useful for tests or dual connections):

```ts
import { createKnexConfig, configure } from 'mevn-orm'
import knex from 'knex'

const config = createKnexConfig({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' }
})

// Inspect or merge, then configure
configure(config)

// Or use Knex yourself
const db = knex(config)
```

## `configure` (advanced)

Pass a full Knex config or an existing Knex instance:

```ts
import knex from 'knex'
import { configure } from 'mevn-orm'

// Full Knex config
configure({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  searchPath: ['knex', 'public'],
  pool: { min: 0, max: 7 }
})

// Existing instance
const db = knex({ client: 'better-sqlite3', connection: { filename: './dev.sqlite' }, useNullAsDefault: true })
configure(db)
```

## Accessing Knex

```ts
import { DB, getDB } from 'mevn-orm'

// After configure / configureDatabase:
const users = await getDB()('users').select('*')

// DB is the same instance once configured (see package export notes)
```

`getDB()` throws if the ORM has not been configured yet:

```txt
Mevn ORM is not configured. Call configure({ client, connection, ... }) before using Model.
```

## Environment-based setup

```ts
// src/db.ts
import { configureDatabase } from 'mevn-orm'

export function initDatabase() {
  const client = (process.env.DB_CLIENT ?? 'better-sqlite3') as 'better-sqlite3' | 'mysql2' | 'pg'

  if (client === 'better-sqlite3') {
    configureDatabase({
      client,
      connection: { filename: process.env.DB_FILENAME ?? './dev.sqlite' }
    })
    return
  }

  if (process.env.DATABASE_URL) {
    configureDatabase({
      client,
      connection: process.env.DATABASE_URL
    })
    return
  }

  configureDatabase({
    client,
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    }
  })
}
```

## Example env file

```bash
# .env.example
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=app_db

# Or use a URL
# DATABASE_URL=postgres://user:pass@localhost:5432/app_db
```

## Next steps

- [Models](/guide/models)
- [Migrations](/guide/migrations)
- [Raw Knex](/guide/raw-knex)
