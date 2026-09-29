# Relationships API

Relation helpers live on `Model` instances. They return Promise-like wrappers you can `await` or chain.

## Model Methods

### `hasOne(Related, localKey?, foreignKey?): HasOneRelation`

One-to-one from this model to `Related`.

| Parameter | Default |
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

| Parameter | Default |
| --- | --- |
| `foreignKey` | Required for correct SQL in practice |
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

## Relation Classes

All extend abstract `Relation` and implement `PromiseLike`.

### Shared API

```ts
abstract class Relation<TResult, TRelated> implements PromiseLike<TResult> {
  where(conditions: WhereAttributes<TRelated>): this
  where(column: AttributeColumn<TRelated>, operator: ComparisonOperator, value: unknown): this
  where(group: (query: FilterGroup<TRelated>) => void): this
  whereIn(column, values): this
  whereNotIn(column, values): this
  whereBetween(column, bounds): this
  whereNull(column): this
  whereNotNull(column): this
  whereLike(column, pattern): this
  whereILike(column, pattern): this
  orderBy(column: AttributeColumn<TRelated>, direction?: 'asc' | 'desc'): this
  limit(count: number): this
  offset(count: number): this
  first(columns?: string | string[]): Promise<TRelated | null>
  get(columns?: string | string[]): Promise<TRelated[]>
  count(column?: string): Promise<number>
  paginate(perPage?: number, page?: number, columns?: string | string[]): Promise<RelationPaginatedResult<TRelated>>
  then(...) // enables await relation
}
```

#### `where(conditions)`

Object form is typed from the related model's declared columns.

Adds equality conditions to the relation query:

```ts
relation.where({ active: true })
relation.where({ region: 'west' })
```

Comparisons, membership, ranges, NULL checks, and LIKE filters use the same typed methods as model queries. For the callback form of `.where()`, the ORM supplies a temporary filter builder as the callback argument. Its conditions form one parenthesized group, so OR methods remain constrained by the relation's parent key:

```ts
const matching = await farmer.farms()
  .where((filters) => {
    filters.whereLike('name', '%orchard%')
    filters.orWhereLike('name', '%meadow%')
  })
  .get()
```

The callback may contain nested groups. See [Queries](/guide/queries) for bound-value, Date, empty-list, and wildcard rules.

#### `first(columns?)`

Executes and returns one related model or `null`.

#### `get(columns?)`

Executes and returns an array of related models (empty if none).

#### `orderBy(column, direction?)`, `limit(count)`, `offset(count)`

Apply ordering and bounds to the relation query while keeping the parent key filter. Direct `await relation` still uses the relation's original return shape.

#### `count(column?)`, `paginate(perPage?, page?, columns?)`

`count()` counts all filtered related rows, ignoring order, limit, and offset. `paginate()` defaults to 15 rows on page 1 and returns page metadata matching model pagination, with `data: TRelated[]`. It uses a cloned data query, so the relation remains reusable. Hidden fields are stripped from the returned models.

#### `await relation`

Calls the subclass `resolve()`:

| Class | `resolve()` |
| --- | --- |
| `HasOneRelation` | `first()` → `T \| null` |
| `HasManyRelation` | `get()` → `T[]` |
| `BelongsToRelation` | `first()` → `T \| null` |

### Null Query Guards

If the parent lacks a key needed to build the query (e.g. no `id`), the internal query may be `null`. Then:

- `first()` → `null`
- `get()` → `[]`
- `count()` → `0`
- `paginate()` → an empty page with `total: 0`, `current_page: 1`, and `last_page: 1`

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
