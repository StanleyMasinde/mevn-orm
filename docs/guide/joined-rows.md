# Read joined rows

Use `joinRows()` to make one read from related tables. For example, you can list each farmer beside each of their farms without loading farmers first and then querying farms one at a time. The result is a flat array: a farmer with two farms appears in two rows, while a farmer with no farm appears once with `farmName: null` in a left join.

The examples use `Farmer`, `Farm`, and `Profile` models mapped to `farmers`, `farms`, and `profiles`. Both `farms` and `profiles` have a `farmer_id` column that points to `farmers.id`.

## List farmers and their farms

Pass the starting model and an alias to `joinRows()`, join the related model, then choose the columns to return:

```ts
import { joinRows } from 'mevn-orm'

const rows = await joinRows(Farmer, 'f')
  .leftJoin(Farm, { as: 'farm', on: ['f.id', '=', 'farm.farmer_id'] })
  .project({
    farmerId: 'f.id',
    farmerName: 'f.name',
    farmName: 'farm.name',
  })
  .orderBy('f.id')
  .orderBy('farm.id')
  .rows()
```

If Amina owns Sunrise Farm and Valley Farm, and Ben owns no farm, `rows` looks like this:

```ts
[
  { farmerId: 1, farmerName: 'Amina', farmName: 'Sunrise Farm' },
  { farmerId: 1, farmerName: 'Amina', farmName: 'Valley Farm' },
  { farmerId: 2, farmerName: 'Ben', farmName: null },
]
```

`'f'` and `'farm'` are table aliases used to identify columns with the same name, such as `id`. The keys in `project()` become the keys in each result object. Selecting `f.id` as `farmerId` means `farm.id` cannot silently replace the farmer's ID. `rows()` returns plain objects, not `Farmer` or `Farm` instances; you cannot call model methods such as `save()` on them.

The `leftJoin()` keeps farmers without farms. Use `innerJoin()` with the same arguments if you only want farmers that have a matching farm.

## Include a profile and filter farms

Add a second join to read a farmer's profile alongside their farms. Put a condition on the farm join when you want to show only active farms but still keep farmers with no active farm:

```ts
const rows = await joinRows(Farmer, 'f')
  .leftJoin(Profile, { as: 'p', on: ['f.id', '=', 'p.farmer_id'] })
  .leftJoin(Farm, {
    as: 'farm',
    on: ['f.id', '=', 'farm.farmer_id'],
    onWhere: { 'farm.active': true },
  })
  .project({
    farmerId: 'f.id',
    farmerName: 'f.name',
    profileBio: 'p.bio',
    farmName: 'farm.name',
  })
  .orderBy('f.id')
  .rows()
```

`onWhere` adds `farm.active = true` to the join condition. A farmer with no active farm remains in the result with `farmName: null`. By comparison, adding `.where('farm.active', '=', true)` after the join filters that farmer out. A missing profile yields `profileBio: null`. If a farmer has several matching farms, their name and bio repeat once per farm.

## Count and paginate the result

`count()` and `paginate()` count joined rows, not unique farmers. If Amina has two farms and Ben has none, the first example has three joined rows. `count()` ignores `limit()` and `offset()`; pagination uses the full joined-row count for `total`.

```ts
const query = joinRows(Farmer, 'f')
  .leftJoin(Farm, { as: 'farm', on: ['f.id', '=', 'farm.farmer_id'] })
  .project({ farmerId: 'f.id', farmName: 'farm.name' })
  .orderBy('f.id')
  .orderBy('farm.id')

const totalRows = await query.count() // 3 for Amina and Ben in the example
const page = await query.paginate(2, 1)
// page.data contains Amina's two farm rows; page.total is 3
```

`paginate(perPage, page)` returns `{ data, total, per_page, current_page, next_page, prev_page, last_page }`. `data` is an array of projected plain rows. Pages start at 1 and clamp to the final page. Use `clone()` if you want to add different filters to separate copies of a query. You can also use qualified columns with `where()` and `orderBy()`, or set `limit()` and `offset()` directly.

## Types, privacy, and backend support

If your models declare their database fields, TypeScript infers the projected value types. A field from a left-joined model includes `null` in its type. Models without declared fields return `unknown` values. Drivers can return their native representations, such as a numeric SQLite boolean.

Projection reads database values directly, including fields listed in a model's `hidden` array. Select only fields you intend to return. Existing `Model.all()`, `first()`, `count()`, and `paginate()` behaviour remains unchanged, and no migration is needed.

The Knex backend and db0's supported SQLite and MySQL connectors support joined rows. Other backends can implement the optional `Backend.joinedRows(plan, count)` capability. Without it, a joined-row terminal throws before executing the query; ordinary model queries still work. Table names, aliases, and column names must be SQL identifiers made of letters, digits, and underscores, starting with a letter or underscore. Values are bound rather than added to SQL text.
