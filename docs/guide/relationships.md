# Relationships

Define relationship methods on your models. They return **lazy** relation instances that are Promise-like: you can `await` them directly or chain constraints before they execute.

## Defining relations

```ts
import { Model } from 'mevn-orm'

class Profile extends Model {
  override fillable = ['farmer_id', 'bio']
}

class Farm extends Model {
  override fillable = ['farmer_id', 'name', 'region', 'active']

  farmer() {
    return this.belongsTo(Farmer, 'farmer_id')
  }
}

class Farmer extends Model {
  override fillable = ['name', 'email', 'password']
  override hidden = ['password']

  profile() {
    return this.hasOne(Profile)
  }

  farms() {
    return this.hasMany(Farm)
  }
}
```

## Relationship types

| Method | Cardinality | Default keys |
| --- | --- | --- |
| `hasOne(Related, localKey?, foreignKey?)` | One-to-one | `localKey` = parent `id`; `foreignKey` = `{modelName}_id` |
| `hasMany(Related, localKey?, foreignKey?)` | One-to-many | same defaults |
| `belongsTo(Related, foreignKey?, ownerKey?)` | Inverse | `foreignKey` required in practice; `ownerKey` defaults to `id` |

### Key defaults

For `Farmer` (`modelName` → `farmer`):

```ts
// hasOne / hasMany
this.hasOne(Profile)
// SELECT * FROM profiles WHERE farmer_id = <this.id>

this.hasMany(Farm)
// SELECT * FROM farms WHERE farmer_id = <this.id>

// belongsTo on Farm
this.belongsTo(Farmer, 'farmer_id')
// SELECT * FROM farmers WHERE id = <this.farmer_id>
```

### Custom keys

```ts
class Order extends Model {
  customer() {
    return this.belongsTo(Customer, 'customer_uuid', 'uuid')
  }

  lineItems() {
    return this.hasMany(LineItem, 'id', 'order_id')
  }
}
```

## Loading relations

### Auto-resolve (await)

```ts
const farmer = await Farmer.find(1)

const profile = await farmer.profile()  // Profile | null
const farms = await farmer.farms()      // Farm[]
```

### Chain then execute

Relation instances support `where()`, `orderBy()`, `limit()`, `offset()`, `first()`, `get()`, `count()`, and `paginate()`:

```ts
const farmer = await Farmer.findOrFail(1)

// First matching related row
const activeFarm = await farmer.farms().where({ active: true }).first()

// All matching related rows
const westFarms = await farmer.farms().where({ region: 'west' }).get()

// belongsTo / hasOne with filters
const profile = await farmer.profile().where({ published: true }).first()

const page = await farmer.farms().orderBy('name').paginate(20, 1)
// page.data is Farm[]; page.total counts every matching farm

const nextFarm = await farmer.farms().orderBy('name').offset(1).limit(1)

const matching = await farmer.farms()
  .where((filters) => {
    filters.whereLike('name', '%orchard%')
    filters.orWhereLike('name', '%meadow%')
  })
  .get()
```

Ordering and paging retain the parent key filter. A direct `await` still returns a single model or an array according to the relation type. `count()` ignores order, limit, and offset, as model counts do. Pagination defaults to 15 rows on page 1, clamps a page past the end, and returns `total`, `per_page`, `current_page`, `next_page`, `prev_page`, and `last_page`. An unsaved parent yields zero rows and a valid empty page. Related models still have hidden fields stripped.

Comparisons, membership, ranges, NULL checks, and text filters can also be chained on relations. In the example, `.where()` creates a temporary filter builder and passes it to the callback as `filters`. The two conditions become one parenthesized group: `farmer_id = ? AND (name LIKE ? OR name LIKE ?)`. The OR therefore stays within this farmer's farms. See [Queries](/guide/queries) for filter values and backend behavior.

### Behaviour by relation type

| Class | `await relation` | Typical use |
| --- | --- | --- |
| `HasOneRelation` | single model or `null` | profile, settings |
| `HasManyRelation` | array of models | posts, farms |
| `BelongsToRelation` | single model or `null` | author, owner |

## Read a many-to-many relation from a model

When a junction table links models, define the relation in the model and query it through the instance. For example, `comment_posts` can link a comment to several posts and store a `position` for each link. Its columns are `comment_id`, `post_id`, `comment_type`, and `position`; `comments` and `posts` each have an `id` column.

The following schema and rows demonstrate two links for comment 1. The `photo` row shares the same numeric parent key, so the relation must check the type as well:

```sql
CREATE TABLE comments (id INTEGER PRIMARY KEY, body TEXT);
CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT);
CREATE TABLE comment_posts (
  comment_id INTEGER, post_id INTEGER,
  comment_type VARCHAR(50), position INTEGER
);

INSERT INTO comments VALUES (1, 'Useful');
INSERT INTO posts VALUES (10, 'First'), (20, 'Second');
INSERT INTO comment_posts VALUES
  (1, 10, 'comment', 1),
  (1, 20, 'comment', 2),
  (1, 10, 'photo', 99);
```

Declare the relation in `Comment`. The discriminator keeps `comment_posts` rows for other parent types out of this relation:

```ts
import { Model } from 'mevn-orm'

class Post extends Model {
  declare title: string
}

class Comment extends Model {
  declare body: string

  post() {
    return this.belongsToMany(Post, {
      table: 'comment_posts',
      pivot: ['position'] as const,
      discriminator: { column: 'comment_type', value: 'comment' },
    }).typedPivot<{ position: number }>()
  }
}
```

`belongsToMany()` infers `comment_id` from `Comment` and `post_id` from `Post`, following the same `{modelName}_id` convention as the other relation helpers. Set `parentKey` or `relatedKey` only when the junction table uses different names. `parentColumn` and `relatedColumn` default to `id`.

Now load the comment and query its posts. Callers do not pass the discriminator again:

```ts
const comment = await Comment.findOrFail(1)
const entries = await comment.post().orderBy('title')

const summary = entries.map(({ related: post, pivot }) => ({
  postId: post.id,
  title: post.title,
  position: pivot.position,
}))
```

If comment 1 links to posts 10 and 20, `summary` is an array like this:

```ts
[
  { postId: 10, title: 'First', position: 1 },
  { postId: 20, title: 'Second', position: 2 },
]
```

`await comment.post()` loads all post columns. Use `comment.post().get(['id', 'title'])` to select columns. Each entry contains a `Post` instance in `related` and the matching junction values in `pivot`. Duplicate junction rows produce separate entries; an absent comment key or no matches produces `[]`. The model's hidden fields are stripped from `related`.

The fixed `comment_type = 'comment'` condition is applied to the relation query and bound as a value. A row with `comment_id = 1` and `comment_type = 'photo'` cannot appear in `comment.post()`. A database join pairs each junction row with its post in one read, using the database's key equality rules. `typedPivot()` declares TypeScript values for selected junction columns; it does not convert database values.

## End-to-end example

```ts
import { configureDatabase, Model } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})

class User extends Model {
  override fillable = ['email']
  override hidden = []

  passwordResetToken() {
    return this.hasOne(PasswordResetToken)
  }

  posts() {
    return this.hasMany(Post)
  }
}

class PasswordResetToken extends Model {
  override fillable = ['user_id', 'token']

  user() {
    return this.belongsTo(User, 'user_id')
  }
}

class Post extends Model {
  override fillable = ['user_id', 'title', 'published']

  author() {
    return this.belongsTo(User, 'user_id')
  }
}

async function demo() {
  const user = await User.create({ email: 'dev@example.com' })

  await PasswordResetToken.create({
    user_id: user.id,
    token: 'abc123'
  })

  await Post.createMany([
    { user_id: user.id, title: 'Draft', published: false },
    { user_id: user.id, title: 'Live', published: true }
  ])

  const token = await user.passwordResetToken()
  console.log(token?.token) // 'abc123'

  const published = await user.posts().where({ published: true }).get()
  console.log(published.map((p) => p.title)) // ['Live']

  const author = await published[0].author()
  console.log(author?.email) // 'dev@example.com'
}
```

## Express route example

```ts
import { Router } from 'express'
import { Farmer } from '../models/Farmer.js'

const router = Router()

router.get('/farmers/:id', async (req, res) => {
  const farmer = await Farmer.find(Number(req.params.id))
  if (!farmer) {
    return res.status(404).json({ error: 'Not found' })
  }

  const [profile, farms] = await Promise.all([
    farmer.profile(),
    farmer.farms().where({ active: true }).get()
  ])

  return res.json({
    ...farmer.toArray(),
    profile: profile?.toArray() ?? null,
    farms: farms.map((f) => f.toArray())
  })
})

export default router
```

## Notes and limitations

- Relations are **not** eager-loaded automatically. Call them when you need related data.
- Each relation method builds a fresh query; they do not cache results on the parent.
- For complex joins or multi-table filters, use [raw Knex](/guide/raw-knex) via `getDB()`.
- Ensure foreign key columns exist in the schema (via [migrations](/guide/migrations)).

## Next steps

- [Serialization](/guide/serialization)
- [API: Relationships](/api/relationships)
