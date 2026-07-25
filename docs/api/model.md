# Model

ActiveRecord-style base class backed by Knex. Extend for each table.

```ts
import { Model } from 'mevn-orm'

class User extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}
```

## Instance properties

### `fillable: string[]`

Attributes allowed through instance [`save()`](#save). Default `[]`.

### `hidden: string[]`

Attributes excluded from [`toArray()`](#toarray) and stripped after many read/create paths. Default `[]`.

### `table: string`

Database table. Defaults to plural snake_case of the class name. Override when inference is wrong:

```ts
class PasswordReset extends Model {
  override table = 'password_reset_tokens'
}
```

### `modelName: string`

Snake_case singular form of the class name (e.g. `PasswordResetToken` → `password_reset_token`). Used for default foreign key names on relations.

### `id?: number`

Primary key after insert or load.

---

## Static properties & helpers

### `static currentTable: string`

Resolved table name for the class (honours `override table`).

### `static resolveTable(): string`

Same resolution as `currentTable`.

### `static currentQuery`

Internal scoped Knex builder. Set by chain methods; cleared by terminal methods. Prefer not to touch this directly.

### `static ensureCurrentQuery()`

Returns `currentQuery`, creating `getDB()(table)` when absent. Used by `orderBy` / `limit` / `offset` without a prior `where`.

---

## Instance methods

### `constructor(properties?: Record<string, unknown>)`

Assigns properties, initialises `fillable` / `hidden`, and sets `modelName` / `table` from the class name.

### `save(): Promise<this>`

Inserts using **only** `fillable` fields, reloads the row, sets `id`, and returns `this`.

```ts
const user = new User()
user.name = 'Jane'
user.email = 'jane@example.com'
user.password = hashed
await user.save()
```

### `update(properties): Promise<this>`

Updates the row by `id`, reloads, returns a new instance of the same class. Throws if `id` is missing.

```ts
const updated = await user.update({ name: 'Jane Updated' })
```

### `delete(): Promise<void>`

Deletes by `id`. Throws if `id` is missing.

### `toArray(): Record<string, unknown>`

Plain object for API responses. Omits `fillable`, `hidden`, `modelName`, `table`, function values, and all `hidden` attributes.

### `stripColumns(model, keepInternalState?): T`

Removes private / hidden keys from a model object in place. Used internally after loads.

### Relationship helpers

Documented under [Relationships](/api/relationships):

- `hasOne(Related, localKey?, foreignKey?)`
- `hasMany(Related, localKey?, foreignKey?)`
- `belongsTo(Related, foreignKey?, ownerKey?)`

---

## Static CRUD

All static methods that return models preserve the **derived** type (`User.find` → `User | null`).

### `static find(id, columns?): Promise<InstanceType<T> | null>`

Find by primary key. Returns `null` when missing.

```ts
const user = await User.find(1)
const partial = await User.find(1, ['id', 'email'])
```

### `static findOrFail(id, columns?): Promise<InstanceType<T>>`

Like `find`, but throws `Error: ${Name} with id "${id}" not found`.

### `static create(properties): Promise<InstanceType<T>>`

Insert one row and return a model instance (hidden fields stripped).

```ts
const user = await User.create({ name, email, password: hashed })
```

### `static createMany(properties[]): Promise<InstanceType<T>[]>`

Insert many rows sequentially. Empty array returns `[]`.

### `static firstOrCreate(attributes, values?): Promise<InstanceType<T>>`

Return the first row matching `attributes`, or create with `{ ...attributes, ...values }`.

```ts
const user = await User.firstOrCreate(
  { email: 'jane@example.com' },
  { name: 'Jane', password: hashed }
)
```

### `static update(properties): Promise<number | undefined>`

Bulk update. Uses the current scope if set via `where()`, otherwise the whole table. Resets scope afterwards.

### `static destroy(): Promise<number | undefined>`

Bulk delete. Same scoping rules as `update`.

---

## Static query builder

Chain scopes, then a terminal method. Scope resets after terminals.

### Scopes

| Method | Signature | Notes |
| --- | --- | --- |
| `where` | `where(conditions?: Row): typeof Model` | Knex equality object |
| `orderBy` | `orderBy(column, direction?: 'asc' \| 'desc')` | Default `'asc'` |
| `limit` | `limit(count: number)` | |
| `offset` | `offset(count: number)` | |

```ts
User.where({ active: true }).orderBy('name').limit(10).all()
```

### Terminals

| Method | Returns |
| --- | --- |
| `first(columns?)` | `InstanceType<T> \| null` |
| `all(columns?)` | `ModelCollection<InstanceType<T>>` |
| `count(column?)` | `number` (default column `*`) |
| `paginate(perPage?, page?, columns?)` | `PaginatedResult<InstanceType<T>>` |
| `update` / `destroy` | row counts |

Default `perPage` for `paginate` is **15**; default `page` is **1**.

### `PaginatedResult<T>`

```ts
interface PaginatedResult<T extends Model> {
  data: ModelCollection<T>
  total: number
  per_page: number
  current_page: number
  next_page: number | null
  prev_page: number | null
  last_page: number
}
```

---

## ModelCollection

```ts
class ModelCollection<T extends Model> extends Array<T> {
  toArray(): Record<string, unknown>[]
}
```

Returned by `all()` and `paginate().data`. Supports normal array methods plus collection-level serialisation.
