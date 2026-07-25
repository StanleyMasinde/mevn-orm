# Relationships API

Relation helpers live on `Model` instances. They return Promise-like wrappers you can `await` or chain.

## Model methods

### `hasOne(Related, localKey?, foreignKey?): HasOneRelation`

One-to-one from this model to `Related`.

| Param | Default |
| --- | --- |
| `localKey` | parent primary key (`id`) |
| `foreignKey` | `{this.modelName}_id` |

```ts
class Farmer extends Model {
  profile() {
    return this.hasOne(Profile)
    // profiles.farmer_id = this.id
  }
}

const profile = await farmer.profile() // Profile | null
```

### `hasMany(Related, localKey?, foreignKey?): HasManyRelation`

One-to-many. Same key defaults as `hasOne`.

```ts
class Farmer extends Model {
  farms() {
    return this.hasMany(Farm)
  }
}

const farms = await farmer.farms() // Farm[]
const active = await farmer.farms().where({ active: true }).get()
```

### `belongsTo(Related, foreignKey?, ownerKey?): BelongsToRelation`

Inverse relation.

| Param | Default |
| --- | --- |
| `foreignKey` | required for correct SQL in practice |
| `ownerKey` | `id` on the related table |

```ts
class Farm extends Model {
  farmer() {
    return this.belongsTo(Farmer, 'farmer_id')
  }
}

const owner = await farm.farmer() // Farmer | null
```

---

## Relation classes

All extend abstract `Relation` and implement `PromiseLike`.

### Shared API

```ts
abstract class Relation<TResult, TRelated> implements PromiseLike<TResult> {
  where(...args: unknown[]): this
  first(columns?: string | string[]): Promise<TRelated | null>
  get(columns?: string | string[]): Promise<TRelated[]>
  then(...) // enables await relation
}
```

#### `where(...args)`

Forwards to Knex `where`. Supports object form and other Knex signatures:

```ts
relation.where({ active: true })
relation.where('region', 'west')
```

#### `first(columns?)`

Executes and returns one related model or `null`.

#### `get(columns?)`

Executes and returns an array of related models (empty if none).

#### `await relation`

Calls the subclass `resolve()`:

| Class | `resolve()` |
| --- | --- |
| `HasOneRelation` | `first()` → `T \| null` |
| `HasManyRelation` | `get()` → `T[]` |
| `BelongsToRelation` | `first()` → `T \| null` |

### Null query guards

If the parent lacks a key needed to build the query (e.g. no `id`), the internal query may be `null`. Then:

- `first()` → `null`
- `get()` → `[]`

---

## Exports

```ts
import {
  Relation,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation
} from 'mevn-orm'
```

These are useful for typing; day-to-day code usually only uses the `Model` helpers.

## Guide

See [Relationships](/guide/relationships) for end-to-end examples.
