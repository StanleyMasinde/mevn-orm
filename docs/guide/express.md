# Express

Wire Mevn ORM into an Express app: configure once at startup, define models, and use them in route handlers.

## Project sketch

```
app/
├── src/
│   ├── db.ts
│   ├── models/
│   │   └── User.ts
│   ├── routes/
│   │   └── users.ts
│   └── index.ts
├── migrations/
└── package.json
```

## Configure at boot

```ts
// src/db.ts
import { configureDatabase, setMigrationConfig } from 'mevn-orm'

export function initDatabase() {
  configureDatabase({
    client: (process.env.DB_CLIENT as 'mysql2' | 'pg' | 'better-sqlite3') ?? 'mysql2',
    connection: process.env.DATABASE_URL ?? {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'app'
    }
  })

  setMigrationConfig({
    directory: new URL('../migrations', import.meta.url).pathname,
    extension: 'ts'
  })
}
```

```ts
// src/index.ts
import express from 'express'
import { initDatabase } from './db.js'
import usersRouter from './routes/users.js'

initDatabase()

const app = express()
app.use(express.json())
app.use('/users', usersRouter)

app.listen(3000, () => {
  console.log('http://localhost:3000')
})
```

## Model

```ts
// src/models/User.ts
import { Model } from 'mevn-orm'

export class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

## Routes with full CRUD

```ts
// src/routes/users.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { User } from '../models/User.js'

const router = Router()

// List (paginated)
router.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1)
    const perPage = Number(req.query.perPage ?? 15)
    const result = await User.orderBy('id', 'desc').paginate(perPage, page)

    res.json({
      data: result.data.toArray(),
      meta: {
        total: result.total,
        per_page: result.per_page,
        current_page: result.current_page,
        next_page: result.next_page,
        prev_page: result.prev_page,
        last_page: result.last_page
      }
    })
  } catch (error) {
    next(error)
  }
})

// Show
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.find(Number(req.params.id))
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user.toArray())
  } catch (error) {
    next(error)
  }
})

// Create
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, password: hashed })
    res.status(201).json(user.toArray())
  } catch (error) {
    next(error)
  }
})

// Update
router.patch('/:id', async (req, res, next) => {
  try {
    const user = await User.find(Number(req.params.id))
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const payload: Record<string, unknown> = {}
    if (req.body.name !== undefined) payload.name = req.body.name
    if (req.body.email !== undefined) payload.email = req.body.email
    if (req.body.password) {
      payload.password = await bcrypt.hash(req.body.password, 12)
    }

    const updated = await user.update(payload)
    res.json(updated.toArray())
  } catch (error) {
    next(error)
  }
})

// Delete
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.find(Number(req.params.id))
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    await user.delete()
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router
```

## Filter + sort example

```ts
router.get('/search', async (req, res, next) => {
  try {
    let query = User as typeof User

    if (req.query.email) {
      query = query.where({ email: String(req.query.email) })
    }

    const users = await query
      .orderBy('created_at', 'desc')
      .limit(50)
      .all()

    res.json(users.toArray())
  } catch (error) {
    next(error)
  }
})
```

::: warning Query chain typing
`where` / `orderBy` return the model constructor for chaining. Prefer a single fluent chain rather than reassigning mid-handler when TypeScript gets noisy:

```ts
const users = await User
  .where({ email: String(req.query.email) })
  .orderBy('id', 'desc')
  .all()
```
:::

## Error middleware

```ts
app.use((error: unknown, _req, res, _next) => {
  console.error(error)
  const message = error instanceof Error ? error.message : 'Server error'
  res.status(500).json({ error: message })
})
```

## Next steps

- [Relationships](/guide/relationships) in nested resources
- [Security](/guide/security)
- [Nuxt / Nitro](/guide/nuxt) if you use Nuxt server routes instead
