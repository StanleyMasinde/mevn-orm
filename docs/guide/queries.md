# Queries

Start a query with a model's scope method, then call a **terminal** method. Each chain has independent scope, so concurrent requests cannot change each other's filters.

## Anatomy of a query

```ts
const leads = await Lead
  .where({ user_id: userId })   // scope
  .orderBy('created_at', 'desc') // scope
  .limit(10)                     // scope
  .all()                         // terminal → ModelCollection
```

## Scope methods

| Method | Description |
| --- | --- |
| `where(conditions)` | Equality conditions (typed from declared columns) |
| `orderBy(column, direction?)` | Sort (`'asc'` \| `'desc'`, default `'asc'`) |
| `limit(count)` | Maximum rows |
| `offset(count)` | Skip rows (often with `limit`) |
| `clone()` | Fork the current filters, ordering, limit, and offset into an independent query |

```ts
// Equality object
await User.where({ email: 'jane@example.com' }).first()

// Compose freely
await Post
  .where({ published: true })
  .orderBy('created_at', 'desc')
  .offset(20)
  .limit(10)
  .all()

// orderBy without a prior where (queries the whole table)
await Lead.orderBy('created_at', 'desc').all()

// Branch without changing the reusable base query
const base = Post.where({ published: true })
const recent = base.clone().orderBy('created_at', 'desc').limit(10)
const featured = base.clone().where({ featured: true })
```

## Terminal methods

| Method | Returns |
| --- | --- |
| `first(columns?)` | First matching model, or `null` |
| `firstOrFail(columns?)` | First matching model, or throws if missing |
| `all(columns?)` | `ModelCollection` of models |
| `exists()` | Whether the current filtered, limited, and offset result contains a row |
| `value(column)` | First column value, or `undefined` if no row matches |
| `pluck(column)` | Array of column values in result order |
| `count(column?)` | Number of matching rows |
| `paginate(perPage?, page?, columns?)` | Page data + metadata |
| `update(properties)` | Rows updated (number) |
| `destroy()` | Rows deleted (number) |

### First and all

```ts
const user = await User.where({ email: 'jane@example.com' }).first()

const admins = await User.where({ role: 'admin' }).all()
for (const admin of admins) {
  console.log(admin.email)
}

// Column selection
const slim = await User.all(['id', 'email'])
```

Without a prior scope, `first()` / `all()` operate on the whole table:

```ts
const anyone = await User.first()
const everyone = await User.all()
```

### Scalar reads

```ts
const query = User.where({ active: true }).orderBy('id')
const hasUsers = await query.exists()
const firstName = await query.value('name')
const names = await query.pluck('name')
const firstUser = await query.firstOrFail()
```

These helpers leave `query` reusable. `value()` and `pluck()` select only the requested column and return its declared TypeScript type when the model declares fields; untyped models return `unknown`. `value()` returns `undefined` for no row and preserves a SQL `NULL` as `null`. `pluck()` returns `[]` for no rows and preserves `null` entries. `exists()` respects `offset()` and returns `false` for `limit(0)`. `count()` still counts the full filtered scope, ignoring limit and offset. Scalar reads return requested database values directly, including columns marked `hidden`; avoid exposing those values in API responses.

The new helpers are available on `ModelQuery` objects such as `User.where(...)` or `User.orderBy(...)`. They add no names to `Model` itself, so subclasses can retain methods with the same names.

### Count

```ts
const total = await User.count()
const active = await User.where({ active: true }).count()
```

### Scoped bulk writes

```ts
const updated = await User
  .where({ active: false })
  .update({ archived: true })

const deleted = await Session
  .where({ expired: true })
  .destroy()
```

## Pagination

`paginate()` defaults to **15** items per page on page **1**.

```ts
const result = await Post.paginate()
const result10 = await Post.paginate(10)
const page2 = await Post
  .where({ published: true })
  .orderBy('created_at', 'desc')
  .paginate(10, 2)
```

### Result shape

```ts
{
  data: ModelCollection<Post>, // use .toArray() for plain objects
  total: number,
  per_page: number,
  current_page: number,
  next_page: number | null,
  prev_page: number | null,
  last_page: number,
}
```

### API handler example

```ts
// Express / Nitro style
export async function listPosts(req: { query: { page?: string; perPage?: string } }) {
  const page = Number(req.query.page ?? 1)
  const perPage = Number(req.query.perPage ?? 15)

  const result = await Post
    .where({ published: true })
    .orderBy('created_at', 'desc')
    .paginate(perPage, page)

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
}
```

### Pagination edge cases

- Page numbers are clamped into a valid range (never less than 1, never past `last_page`).
- Empty tables still return a valid structure with `total: 0` and `last_page: 1`.
- The query object can be reused after `paginate()`; other chains are independent.
- Relation pagination uses the same metadata, with `data` as an array of related models.

## Backend support

Query cloning and scalar helpers use the existing query backend operations. They work with the Knex backend and db0's supported SQLite and MySQL connectors. Relation sorting, counting, and pagination use the same operations. No backend interface methods are required beyond those already used by model queries, and no migration is needed.

## ModelCollection

`all()` and `paginate().data` return a `ModelCollection`, which is an `Array` subclass:

```ts
const users = await User.all()

users.length
users.map((u) => u.email)
users.filter((u) => u.active)

// Plain objects for JSON responses
return users.toArray()
```

## Table resolution

Static queries honour `override table` on subclasses:

```ts
class PasswordReset extends Model {
  override table = 'password_reset_tokens'
}

// Uses password_reset_tokens, not password_resets
await PasswordReset.where({ token }).first()

PasswordReset.currentTable // 'password_reset_tokens'
PasswordReset.resolveTable() // same
```

## Query hygiene tips

1. **Always end with a terminal** — scopes alone do not run a query.
2. **Keep query chains local to the request** — `User.where(...)` returns a query object with its own filters.
3. **Prefer scoped updates/deletes** — bare `User.update(...)` / `User.destroy()` affect the whole table.
4. **Use `toArray()` at the boundary** — keep models inside the service layer; send plain objects to clients.

## Next steps

- [Relationships](/guide/relationships)
- [Serialization](/guide/serialization)
- [Raw Knex](/guide/raw-knex) for joins and advanced SQL
