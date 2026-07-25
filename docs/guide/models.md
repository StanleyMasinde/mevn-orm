# Models

Models are ActiveRecord-style classes that map to a database table. Extend `Model`, configure mass-assignment and serialization, then use static and instance methods for persistence.

## Defining a model

```ts
import { Model } from 'mevn-orm'

class User extends Model {
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
