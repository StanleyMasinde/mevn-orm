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

Relation instances support `where()`, `first()`, and `get()`:

```ts
const farmer = await Farmer.findOrFail(1)

// First matching related row
const activeFarm = await farmer.farms().where({ active: true }).first()

// All matching related rows
const westFarms = await farmer.farms().where({ region: 'west' }).get()

// belongsTo / hasOne with filters
const profile = await farmer.profile().where({ published: true }).first()
```

### Behaviour by relation type

| Class | `await relation` | Typical use |
| --- | --- | --- |
| `HasOneRelation` | single model or `null` | profile, settings |
| `HasManyRelation` | array of models | posts, farms |
| `BelongsToRelation` | single model or `null` | author, owner |

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
