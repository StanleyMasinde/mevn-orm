# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)
[![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)
![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

A small ActiveRecord-style ORM for Node.js, built on [Knex](https://knexjs.org/). Define models, query with a fluent API, and use MySQL, PostgreSQL, SQLite, and other Knex-supported databases.

**Documentation:** [https://stanleymasinde.github.io/mevn-orm/](https://stanleymasinde.github.io/mevn-orm/)

## Install

```bash
npm install mevn-orm knex
npm install better-sqlite3   # or mysql2, pg, etc.
```

## Example

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

return users.toArray() // plain objects for API responses
```

## Relationships

```ts
class Farmer extends Model {
  profile() {
    return this.hasOne(Profile)
  }

  farms() {
    return this.hasMany(Farm)
  }
}

const farmer = await Farmer.find(1)
const profile = await farmer.profile()
const active = await farmer.farms().where({ active: true }).get()
```

## Status

This project is in maintenance mode. Core functionality is stable and actively maintained; large new features are limited.

## License

[MIT](./LICENSE)
