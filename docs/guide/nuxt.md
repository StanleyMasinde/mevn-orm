# Nuxt / Nitro

Initialise Mevn ORM in a Nitro server plugin so every server route shares one configured client. Copy migration files into the build output so production boots can run migrations.

## Why a plugin?

Nitro starts a single server process. A `server/plugins/*.ts` file runs at startup — ideal for `configureDatabase` and optional `migrateLatest`.

## `nuxt.config.ts` — ship migrations

Because Nitro bundles server code, migration **files** must be copied into `.output`:

```ts
import { cp } from 'node:fs/promises'

export default defineNuxtConfig({
  nitro: {
    hooks: {
      compiled: async () => {
        await cp(
          'server/assets/migrations',
          '.output/server/assets/migrations',
          { recursive: true }
        )
      }
    }
  }
})
```

Put Knex migrations under `server/assets/migrations/`.

## Server plugin

```ts
// server/plugins/mevn-orm.ts
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

## Models and API routes

```ts
// server/models/User.ts
import { Model } from 'mevn-orm'

export class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

```ts
// server/api/users/index.get.ts
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page ?? 1)
  const perPage = Number(query.perPage ?? 15)

  const result = await User.orderBy('id', 'desc').paginate(perPage, page)

  return {
    data: result.data.toArray(),
    meta: {
      total: result.total,
      per_page: result.per_page,
      current_page: result.current_page,
      next_page: result.next_page,
      prev_page: result.prev_page,
      last_page: result.last_page
    }
  }
})
```

```ts
// server/api/users/[id].get.ts
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const user = await User.find(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return user.toArray()
})
```

```ts
// server/api/users/index.post.ts
import { User } from '../../models/User'
// import { hash } from '...' your preferred hasher

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string; email: string; password: string }>(event)

  if (!body?.name || !body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' })
  }

  const user = await User.create({
    name: body.name,
    email: body.email,
    password: body.password // hash before create in real apps
  })

  setResponseStatus(event, 201)
  return user.toArray()
})
```

## Environment

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/app
# optional:
NITRO_ROLLBACK_ON_BOOT=false
```

## Tips

- Keep models under `server/` so they are not shipped to the client bundle.
- Prefer connection strings in production (`DATABASE_URL`).
- For SQLite in local Nuxt dev, use `better-sqlite3` and a file path outside `node_modules`.
- If migrations fail only in production, confirm the `compiled` hook copied files into `.output/server/assets/migrations`.

## Next steps

- [Migrations](/guide/migrations)
- [Security](/guide/security)
