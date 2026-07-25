# Serialization

Use `toArray()` when returning data from HTTP handlers so clients receive plain objects without ORM internals or sensitive columns.

## Model `toArray()`

```ts
class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}

const user = await User.findOrFail(userId)
return user.toArray()
// {
//   id: 1,
//   name: 'Jane Doe',
//   email: 'jane@example.com'
// }
// password omitted (hidden)
// fillable, hidden, modelName, table omitted (internals)
```

### What is excluded

| Category | Keys |
| --- | --- |
| ORM internals | `fillable`, `hidden`, `modelName`, `table` |
| Hidden attributes | whatever you list in `hidden` |
| Functions | methods on the instance |

## Collection `toArray()`

`Model.all()` and `paginate().data` return a `ModelCollection` with the same helper:

```ts
const users = await User.all()
return users.toArray()
// [{ id: 1, name: '...' }, { id: 2, name: '...' }]
```

```ts
const page = await User.orderBy('id').paginate(20, 1)

return {
  data: page.data.toArray(),
  meta: {
    total: page.total,
    current_page: page.current_page,
    last_page: page.last_page
  }
}
```

## Hidden fields after reads

After `create`, `find` (via strip paths), and similar operations, **hidden** attributes are also removed from the in-memory instance so accidental logging is less likely. Prefer treating models as internal and always serialising at the edge.

```ts
const user = await User.create({
  name: 'Jane',
  email: 'jane@example.com',
  password: hashed
})

// password may already be stripped from the instance
console.log(user.toArray()) // never includes password
```

## Nesting related data

Relations return models (or arrays). Map them yourself:

```ts
const farmer = await Farmer.findOrFail(id)
const farms = await farmer.farms().get()

return {
  ...farmer.toArray(),
  farms: farms.map((f) => f.toArray())
}
```

## API response helpers

```ts
// utils/respond.ts
import type { Model, ModelCollection } from 'mevn-orm'

export function jsonModel(model: Model) {
  return model.toArray()
}

export function jsonCollection(models: ModelCollection<Model> | Model[]) {
  if ('toArray' in models && typeof models.toArray === 'function') {
    return models.toArray()
  }
  return models.map((m) => m.toArray())
}

export function jsonPage<T extends Model>(result: {
  data: ModelCollection<T>
  total: number
  per_page: number
  current_page: number
  next_page: number | null
  prev_page: number | null
  last_page: number
}) {
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

Usage:

```ts
const page = await Post.where({ published: true }).paginate(10, 2)
return jsonPage(page)
```

## Security checklist

- Put secrets (`password`, `token`, `ssn`) in `hidden`.
- Never spread a model into `res.json(user)` if you have not verified hidden fields — use `toArray()`.
- Hash passwords **before** `create` / `save`; serialization only hides, it does not hash.

See also [Security](/guide/security).
