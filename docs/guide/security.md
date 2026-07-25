# Security

Mevn ORM helps with mass-assignment discipline and response hygiene. Application-level security (auth, hashing, validation) remains your responsibility.

## Hash passwords before persist

```ts
import bcrypt from 'bcrypt'
import { User } from './models/User.js'

const password = await bcrypt.hash(plainPassword, 12)
const user = await User.create({
  name,
  email,
  password
})
```

Never store plaintext passwords. Serialization (`hidden`) only omits fields from output — it does **not** encrypt or hash.

## Use `hidden` + `toArray()`

```ts
class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password', 'remember_token']
}

// Good
res.json((await User.findOrFail(id)).toArray())

// Risky — may include unexpected enumerable fields
res.json(await User.findOrFail(id))
```

List every sensitive column in `hidden`: tokens, password hashes, internal flags, PII you must not emit.

## Respect `fillable` on `save()`

Instance `save()` only writes `fillable` keys. That reduces accidental mass assignment when binding request bodies onto a model:

```ts
const user = new User()
user.name = body.name
user.email = body.email
user.password = hashed
user.role = body.role // not in fillable → not inserted by save()
await user.save()
```

::: warning `create()` vs `save()`
`Model.create(properties)` inserts the **properties object you pass**, not only `fillable`. Validate and pick allowed keys before calling `create`:

```ts
const user = await User.create({
  name: body.name,
  email: body.email,
  password: hashed
  // do not pass body.role unless intentional
})
```
:::

## Validate input

```ts
function parseCreateUser(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Invalid body')
  const { name, email, password } = body as Record<string, unknown>
  if (typeof name !== 'string' || name.length < 1) throw new Error('Invalid name')
  if (typeof email !== 'string' || !email.includes('@')) throw new Error('Invalid email')
  if (typeof password !== 'string' || password.length < 8) throw new Error('Invalid password')
  return { name, email, password }
}
```

## Scope destructive queries

```ts
// Dangerous — entire table
await User.destroy()
await User.update({ role: 'admin' })

// Safer
await User.where({ id: userId }).destroy()
await User.where({ id: userId }).update({ name: nextName })
```

## SQL injection

Query methods build parameterised Knex queries for normal object/`where` usage. Avoid concatenating untrusted strings into raw SQL:

```ts
// Avoid
await getDB().raw(`select * from users where email = '${email}'`)

// Prefer bindings
await getDB().raw('select * from users where email = ?', [email])
```

## Keep dependencies current

- Upgrade `mevn-orm`, `knex`, and database drivers regularly.
- Run on supported Node.js versions (20+).
- Review Knex and driver security advisories for your client (`mysql2`, `pg`, `better-sqlite3`, …).

## Checklist

| Practice | Recommendation |
| --- | --- |
| Passwords | Hash before `create` / `save` |
| Secrets in JSON | `hidden` + `toArray()` |
| Mass assignment | Validate body; careful with `create` |
| Bulk update/delete | Always `where(...)` first |
| Raw SQL | Use bindings, never string concat |
| Migrations in prod | Controlled deploy; avoid auto-rollback |
