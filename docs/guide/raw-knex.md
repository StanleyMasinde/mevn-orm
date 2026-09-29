# Raw Knex (`DB`)

For SQL beyond the model API, use the shared Knex instance. For projected inner and left joins, see [Read joined rows](/guide/joined-rows). For model operations spanning one transaction, use the [transaction facade](/guide/transactions).

## Access

```ts
import { configureDatabase, DB, getDB } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})

// Preferred: always works after configure
const knex = getDB()
const users = await knex('users').select('*')

// Package also exports DB (same underlying client once configured)
const rows = await getDB()('users').where({ active: true })
```

`getDB()` throws if you have not called `configure` / `configureDatabase`.

## Joins

```ts
import { getDB } from 'mevn-orm'
import { User } from './models/User.js'

const rows = await getDB()('users')
  .join('posts', 'posts.user_id', 'users.id')
  .where('posts.published', true)
  .select('users.id', 'users.email', 'posts.title as post_title')

// Hydrate models when useful
const userIds = [...new Set(rows.map((r) => r.id))]
const users = await Promise.all(userIds.map((id) => User.find(id as number)))
```

## Transactions

```ts
import { getDB } from 'mevn-orm'
import { User } from './models/User.js'
import { Profile } from './models/Profile.js'

await getDB().transaction(async (trx) => {
  const [userId] = await trx('users').insert({
    email: 'jane@example.com',
    name: 'Jane',
    password: hashed
  })

  await trx('profiles').insert({
    user_id: userId,
    bio: 'Hello'
  })
})

// Or mix: use trx for writes, then read via models after commit
const user = await User.where({ email: 'jane@example.com' }).first()
```

Static model methods use the global Knex client, not an arbitrary raw `trx`. Use [`transaction(async tx => ...)`](/guide/transactions) and `tx.model(User)` to enlist model methods, reloads, and relations. The raw Knex form remains useful for SQL outside the model API.

## Aggregates and reporting

```ts
const stats = await getDB()('orders')
  .select('status')
  .count('* as total')
  .sum('amount as revenue')
  .groupBy('status')
```

## Batch import

```ts
const chunkSize = 500
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize)
  await getDB()('events').insert(chunk)
}
```

## Health check route

```ts
import { getDB } from 'mevn-orm'

export async function health() {
  await getDB().raw('select 1')
  return { ok: true }
}
```

## When to stay on Model

Prefer `Model` for:

- Simple CRUD and pagination
- `fillable` / `hidden` serialization
- Relationships
- Type-preserving `find` / `create`

Use raw Knex for:

- Multi-table joins and complex filters
- SQL operations outside the transaction model facade
- Bulk copy / analytics queries
- Vendor-specific SQL

## Next steps

- [Queries](/guide/queries)
- [Configuration](/guide/configuration)
