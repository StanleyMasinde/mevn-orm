# Models

Models are ActiveRecord-style classes that map to a database table. Extend `Model`, configure mass-assignment and serialization, then use static and instance methods for persistence.

## Defining a model

```ts
import { Model } from 'mevn-orm'

class User extends Model {
  /** Column types for the language server and typechecker (see below). */
  declare name: string
  declare email: string
  declare password: string

  /** Columns allowed when calling instance `save()`. */
  override fillable = ['name', 'email', 'password']

  /** Columns excluded from `toArray()` and stripped after reads. */
  override hidden = ['password']
}
```

### Configuration properties

| Property | Description |
| --- | --- |
| `fillable` | Attributes allowed through instance `save()` mass assignment |
| `hidden` | Attributes excluded from `toArray()` and stripped after reads |
| `table` | Override the inferred database table name |
| `id` | Primary key (set after insert / find) |
| `modelName` | Snake_case singular name from the class name (used for default foreign keys) |

### Typing attributes (LSP / TypeScript)

Static helpers such as `User.find()` already return your **derived class** (`User | null`), not bare `Model`. The language server still needs to know which **columns** exist on that class.

Database values are assigned at runtime (`Object.assign` / row load). They are not constructor field initializers, so declare columns with TypeScript **`declare` fields** — type-only, no emitted runtime code:

```ts
class User extends Model {
  declare id?: number
  declare name: string
  declare email: string
  declare password: string
  declare role?: string

  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}

const user = await User.findOrFail(1)
user.name          // string
user.email.length  // number
// user.nme        // still allowed via Model's index signature — declare columns you care about
```

**Why `declare`?** Prefer `declare name: string` over `name!: string` for ORM models. Attributes come from the database; `declare` documents that without emitting class-field initialization.

#### Why no `@Table` / `@Fillable` decorators?

Mevn ORM does **not** ship model decorators. Configure models with `override fillable`, `override hidden`, `override table`, and relation methods (`hasMany`, …).

- There is no runtime target for `@Fillable() declare name: string` — `declare` fields are type-only and erased at emit.
- Decorators would be a second source of truth next to the arrays and methods the runtime already uses.
- Consumers would need extra `tsconfig` decorator settings; Stage 3 and legacy `experimentalDecorators` are not interchangeable.
- Relation properties (`posts!: HasManyRelation<Post>`) would not match today’s method chaining (`posts().where(…).get()`).

Use TypeORM or MikroORM if you want a decorator-first schema. This library stays explicit and small.

#### Alternative: interface merging

You can put column types on a merged interface instead of `declare` fields:

```ts
interface User {
  name: string
  email: string
  password: string
}

class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

Instance members from the interface merge with the class, so `user.name` is still typed as `string`.

#### Write payloads (`create` / `where` / `update`)

The same declared columns type **writes**. You do not pass a `Model<TAttrs>` type parameter — attributes are inferred from the subclass.

```ts
await User.create({
  name: 'Jane',
  email: 'jane@example.com',
  password: hashedPassword,
})

// User.create({ name: 'Jane' })           // error: email, password required
// User.create({ nme: 'Jane', ... })       // error: unknown key
await User.where({ email: 'jane@example.com' }).first()
await user.update({ name: 'Jane Updated' })
```

| Helper | Shape |
| --- | --- |
| `CreateAttributes<User>` | Declared columns **without** `id` (required fields stay required) |
| `WhereAttributes<User>` / `UpdateAttributes<User>` | `Partial` of declared columns, including `id` |
| `ModelAttributes<User>` | Declared columns including `id` |

Models that declare **no** columns keep the previous loose `Record<string, unknown>` payloads, so existing untyped models keep compiling.

**`id` and defaults:** `create` omits `id` (normally assigned by the database). Columns filled by the database (timestamps, defaults) should be optional:

```ts
declare created_at?: string
declare updated_at?: string
```

**`fillable` / `hidden`:** These stay runtime-only. Types do not restrict `create` to `fillable` keys, and `hidden` fields are not removed from the TypeScript type after load.

You can still narrow in app code with `satisfies` if you want a narrower subset than the model declares.

#### Notes

- **`hidden` and types:** TypeScript does not drop `password` from the type after load just because it is in `hidden`. Runtime `toArray()` / stripping still apply; use `toArray()` for API responses when you need secrets omitted.
- **Optional columns:** Use `declare role?: string` for nullable or not-always-selected fields.
- **Primary key:** `id?: number` is already on `Model`; re-declaring it on the subclass is optional.

### Table name inference

```ts
class User extends Model {}
// table → "users"

class PasswordResetToken extends Model {}
// table → "password_reset_tokens"

class PasswordReset extends Model {
  override table = 'password_reset_tokens' // force a specific table
}
```

Helpers used under the hood:

```ts
import { getTableName, toSnakeCase } from 'mevn-orm'

getTableName('PasswordResetToken') // 'password_reset_tokens'
toSnakeCase('PasswordResetToken')  // 'password_reset_token'
```

## Creating records

### `Model.create`

```ts
const user = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: hashedPassword
})

console.log(user.id)   // 1
console.log(user.name) // 'Jane Doe'
// password is stripped because it is in `hidden`
```

### `Model.createMany`

```ts
const users = await User.createMany([
  { name: 'Ada', email: 'ada@example.com', password: hash1 },
  { name: 'Grace', email: 'grace@example.com', password: hash2 }
])
```

### Instance `save()`

`save()` only persists fields listed in `fillable`:

```ts
const user = new User()
user.name = 'Linus'
user.email = 'linus@example.com'
user.password = hashedPassword
// user.role = 'admin'  // ignored by save() unless listed in fillable

await user.save()
// user.id is now set; row reloaded from the database
```

### `firstOrCreate`

Find by attributes, or create with merged values:

```ts
const user = await User.firstOrCreate(
  { email: 'jane@example.com' },
  { name: 'Jane Doe', password: hashedPassword }
)

// Second call with the same email returns the existing row
const same = await User.firstOrCreate({ email: 'jane@example.com' })
```

## Reading records

```ts
// By primary key
const user = await User.find(1)           // User | null
const user2 = await User.findOrFail(1)    // User, or throws

// Select specific columns
const partial = await User.find(1, ['id', 'email'])

// First / all (see Queries guide for scopes)
const first = await User.first()
const all = await User.all()
```

`findOrFail` throws a clear error when missing:

```ts
try {
  await User.findOrFail(999)
} catch (error) {
  // Error: User with id "999" not found
}
```

Static methods preserve the **derived class type** in TypeScript:

```ts
const u: User | null = await User.find(1)
// not Model | null
```

With [typed attributes](#typing-attributes-lsp--typescript) on `User`, `u.name` is also typed as `string` (not only `u` as `User`).

## Updating records

### Instance update

```ts
const user = await User.findOrFail(1)
const updated = await user.update({ name: 'Jane Updated' })
console.log(updated.name) // 'Jane Updated'
```

Requires `id` on the instance. Throws if missing.

### Bulk update

```ts
// All rows (use carefully)
await User.update({ archived: true })

// Scoped
await User.where({ active: false }).update({ archived: true })
```

## Deleting records

### Instance delete

```ts
const user = await User.findOrFail(1)
await user.delete()
```

### Bulk destroy

```ts
await User.where({ archived: true }).destroy()
```

## Complete example

```ts
import { configureDatabase, Model } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})

class Post extends Model {
  override fillable = ['user_id', 'title', 'body', 'published']
  override hidden = []
}

async function blogDemo() {
  // Create
  const post = await Post.create({
    user_id: 1,
    title: 'Hello Mevn',
    body: 'First post',
    published: true
  })

  // Read
  const found = await Post.findOrFail(post.id as number)

  // Update
  await found.update({ title: 'Hello Mevn ORM' })

  // Query
  const published = await Post
    .where({ published: true })
    .orderBy('id', 'desc')
    .limit(10)
    .all()

  console.log(published.toArray())

  // Delete
  await found.delete()
}
```

## Next steps

- [Queries](/guide/queries) — scopes, pagination, counting
- [Relationships](/guide/relationships)
- [Serialization](/guide/serialization)
