# Queries

Chain scope methods on the model class, then call a **terminal** method. The scope is reset after each terminal call so queries do not leak into the next operation.

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
| `where(conditions)` | Equality conditions passed to Knex `where` (typed from declared columns) |
| `orderBy(column, direction?)` | Sort (`'asc'` \| `'desc'`, default `'asc'`) |
| `limit(count)` | Maximum rows |
| `offset(count)` | Skip rows (often with `limit`) |

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
```

## Terminal methods

| Method | Returns |
| --- | --- |
| `first(columns?)` | First matching model, or `null` |
| `all(columns?)` | `ModelCollection` of models |
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
- The scope is reset after `paginate()`, same as other terminals.

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
2. **Do not reuse partial chains across awaits** — scope is shared on the class via `currentQuery` and cleared after terminals.
3. **Prefer scoped updates/deletes** — bare `User.update(...)` / `User.destroy()` affect the whole table.
4. **Use `toArray()` at the boundary** — keep models inside the service layer; send plain objects to clients.

## Next steps

- [Relationships](/guide/relationships)
- [Serialization](/guide/serialization)
- [Raw Knex](/guide/raw-knex) for joins and advanced SQL
