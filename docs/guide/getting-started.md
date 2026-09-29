# Getting Started

Install Mevn ORM, connect a database, define a model, and run your first queries. Use an existing Nitro db0 connection in Nuxt, or configure a Knex connection directly in another Node app.

## Installation

::: code-group

```sh [npm]
npm install mevn-orm knex
```

```sh [pnpm]
pnpm add mevn-orm knex
```

```sh [yarn]
yarn add mevn-orm knex
```

```sh [bun]
bun add mevn-orm knex
```

:::

Install one driver for your database:

### MySQL

::: code-group

```sh [npm]
npm install mysql2
```

```sh [pnpm]
pnpm add mysql2
```

```sh [yarn]
yarn add mysql2
```

```sh [bun]
bun add mysql2
```

:::

### PostgreSQL

::: code-group

```sh [npm]
npm install pg
```

```sh [pnpm]
pnpm add pg
```

```sh [yarn]
yarn add pg
```

```sh [bun]
bun add pg
```

:::

### SQLite (direct Knex)

::: code-group

```sh [npm]
npm install better-sqlite3
```

```sh [pnpm]
pnpm add better-sqlite3
```

```sh [yarn]
yarn add better-sqlite3
```

```sh [bun]
bun add better-sqlite3
```

:::

::: tip SQLite driver
Use **`better-sqlite3`**. `configureDatabase` / `createKnexConfig` map `client: 'sqlite3'` and `client: 'sqlite'` to the Knex **`better-sqlite3`** driver, so install `better-sqlite3` even if you still pass those names. Both packages are native addons; the alias exists so this library has one SQLite driver, not to avoid compilation.

A raw `configure({ client: 'sqlite3', ... })` is **not** remapped and still requires the `sqlite3` package.
:::

## Nuxt / Nitro with db0

Install db0 and the driver configured in Nitro. For MySQL:

::: code-group

```sh [npm]
npm install mevn-orm knex db0 mysql2
```

```sh [pnpm]
pnpm add mevn-orm knex db0 mysql2
```

```sh [yarn]
yarn add mevn-orm knex db0 mysql2
```

```sh [bun]
bun add mevn-orm knex db0 mysql2
```

:::

Configure the database with Nitro's `database` option in `nuxt.config.ts`, then give Mevn ORM the connection returned by `useDatabase()`:

```ts
// server/plugins/mevn-orm.ts
import { configureDb0 } from 'mevn-orm/db0'

export default defineNitroPlugin(() => {
  configureDb0(useDatabase())
})
```

```ts
// server/models/User.ts
import { Model } from 'mevn-orm/db0'

export class User extends Model {
  override fillable = ['name', 'email']
}
```

```ts
// server/api/users/jane.get.ts
import { User } from '../../models/User'

export default defineEventHandler(async () => {
  const user = await User.where({ email: 'jane@example.com' }).first()
  return user?.toArray() ?? null
})
```

The model API is the same as in a direct Knex app. Knex builds the queries, and db0 executes them through Nitro's connection. For the Nitro configuration, boot migrations, and `.output` copy hook, follow the [Nuxt / Nitro guide](/guide/nuxt) and [migration guide](/guide/db0-migrations).

## Direct Knex example

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

## Direct Knex project layout (suggested)

```
my-app/
├── src/
│   ├── db.ts          # configureDatabase + migration config
│   ├── models/
│   │   ├── User.ts
│   │   └── Post.ts
│   └── index.ts       # Express / Node entry
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
- [Nuxt / Nitro](/guide/nuxt) — use Nitro's db0 connection and run migrations on boot
