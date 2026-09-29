# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)
[![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)
![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

A small ActiveRecord-style ORM for Node.js. Use [Knex](https://knexjs.org/) or an existing [db0](https://db0.unjs.io/) connection (SQLite and MySQL), including Nitro's `useDatabase()`.

**Documentation:** [https://stanleymasinde.github.io/mevn-orm/](https://stanleymasinde.github.io/mevn-orm/)

## Install

```bash
npm install mevn-orm knex
npm install better-sqlite3   # or mysql2, pg, etc.
```

For Nitro or another db0 application, install `mevn-orm knex db0` (and `mysql2` for MySQL), then import from `mevn-orm/db0`. Knex builds the queries; db0 executes them:

```ts
import { Model, configureDb0 } from 'mevn-orm/db0'

configureDb0(useDatabase()) // Nitro server code
class User extends Model {}
```

See the [Nuxt / Nitro guide](https://stanleymasinde.github.io/mevn-orm/guide/nuxt) for Nitro configuration, model queries, and migrations on boot. The [migration guide](https://stanleymasinde.github.io/mevn-orm/guide/db0-migrations) also covers the standalone CLI for development and CI.

## Example

After creating a `users` table with `id`, `name`, `email`, and `password` columns, you can create and query records:

```ts
import { configureDatabase, Model } from 'mevn-orm'

configureDatabase({
  client: 'better-sqlite3',
  connection: { filename: './dev.sqlite' }
})

class User extends Model {
  declare name: string
  declare email: string
  declare password: string

  override fillable = ['name', 'email', 'password']
  override hidden = ['password']
}

const user = await User.create({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'hash-me-first'
})

const found = await User.find(user.id as number)
const users = await User.where({ name: 'Jane Doe' }).all()

console.log(found?.toArray()) // one plain object, or undefined
console.log(users.toArray())  // plain objects for API responses
```

## Relationships

With `farmers`, `profiles`, and `farms` tables and a farmer whose ID is `1`, define and query relations like this:

```ts
import { Model } from 'mevn-orm'

class Profile extends Model {}
class Farm extends Model {}

class Farmer extends Model {
  profile() {
    return this.hasOne(Profile)
  }

  farms() {
    return this.hasMany(Farm)
  }
}

const farmer = await Farmer.findOrFail(1)
const profile = await farmer.profile()
const active = await farmer.farms().where({ active: true }).get()
```

## Status

This project is in maintenance mode. Core functionality is stable and actively maintained; large new features are limited.

## License

[MIT](./LICENSE)
