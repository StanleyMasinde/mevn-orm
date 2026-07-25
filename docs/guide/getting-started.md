# Getting Started

Install Mevn ORM, configure a database, define a model, and run your first queries.

## Installation

```bash
npm install mevn-orm knex
# or
pnpm add mevn-orm knex
# or
yarn add mevn-orm knex
```

Install a driver for your database:

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg

# SQLite (recommended driver)
npm install better-sqlite3
```

::: tip SQLite driver
Use **`better-sqlite3`**. The older `sqlite3` package is discouraged because it needs native compilation. Mevn ORM maps `client: 'sqlite3'` and `client: 'sqlite'` to the Knex **`better-sqlite3`** driver, so install `better-sqlite3` even if you pass those client names for compatibility.
:::

## Minimal example

```ts
import { configureDatabase, Model } from 'mevn-orm'

// 1. Configure once at app startup
configureDatabase({
  client: 'better-sqlite3',
  connection: {
    filename: './dev.sqlite'
  }
})

// 2. Define a model (declare columns so the LSP types user.name as string)
class User extends Model {
  declare name: string
  declare email: string
  declare password: string

  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}

// 3. Use it
async function main() {
  const created = await User.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'hash-me-first' // always hash before persisting
  })

  const found = await User.find(created.id as number)
  await found?.update({ name: 'Jane Updated' })

  const users = await User.where({ name: 'Jane Updated' }).all()
  console.log(users.toArray())
  // [{ id: 1, name: 'Jane Updated', email: 'jane@example.com' }]
}

main()
```

## Project layout (suggested)

```
my-app/
├── src/
│   ├── db.ts          # configureDatabase + migration config
│   ├── models/
│   │   ├── User.ts
│   │   └── Post.ts
│   └── index.ts       # Express / Nitro entry
├── migrations/
└── package.json
```

### `src/db.ts`

```ts
import { configureDatabase, setMigrationConfig } from 'mevn-orm'

export function initDatabase() {
  configureDatabase({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'app_db'
    }
  })

  setMigrationConfig({
    directory: './migrations',
    extension: 'ts'
  })
}
```

### `src/models/User.ts`

```ts
import { Model } from 'mevn-orm'
import type { Post } from './Post.js'

export class User extends Model {
  declare name: string
  declare email: string
  declare password: string

  override fillable = ['name', 'email', 'password']
  override hidden = ['password']

  posts() {
    return this.hasMany(Post as typeof Model)
  }
}
```

## Table names

Table names are inferred from the class name:

| Class | Table |
| --- | --- |
| `User` | `users` |
| `PasswordResetToken` | `password_reset_tokens` |
| `Farm` | `farms` |

Override when your schema differs:

```ts
class PasswordResetToken extends Model {
  override table = 'password_reset_tokens'
}
```

## Next steps

- [Configuration](/guide/configuration) — all clients and connection styles
- [Models](/guide/models) — fillable, hidden, instance CRUD
- [Queries](/guide/queries) — where, orderBy, pagination
- [Relationships](/guide/relationships) — hasOne, hasMany, belongsTo
- [Migrations](/guide/migrations) — create and run schema migrations
