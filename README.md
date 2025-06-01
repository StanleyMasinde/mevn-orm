# Mevn ORM

![npm](https://img.shields.io/npm/v/mevn-orm?style=for-the-badge)  [![GitHub license](https://img.shields.io/github/license/stanleymasinde/mevn-orm?style=for-the-badge)](https://github.com/StanleyMasinde/mevn-orm/blob/master/LICENSE)  ![GitHub issues](https://img.shields.io/github/issues/stanleymasinde/mevn-orm?style=for-the-badge)

**Mevn ORM** is a lightweight ORM for Express.js and MySQL that provides a clean, fluent interface for building queries and managing models.  
It is under maintenance mode and receives security updates. Development is paused, but the core ORM functionality is complete and usable.

## Getting Started

```javascript
const { Model } = require('mevn-orm')

class User extends Model {}

const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret' // hash before storing
})
````

## Features

* Model-based abstraction
* Create, Read, Update, Delete support
* Chainable query builder (`where`, `first`, `all`)
* Timestamps
* Soft deletes
* SQLite support for testing
* Knex-based migration support

## ORM Basics Checklist

* [x] `Model` base class
* [x] `.create`, `.find`, `.update`, `.delete`
* [x] `.where()`, `.first()`, `.all()` chaining
* [x] Table name inference
* [x] Timestamps
* [x] Soft deletes
* [x] Basic relationship hooks (`hasOne`, `hasMany`, `belongsTo`)
* [x] Raw queries
* [x] Knex passthrough
* [x] SQLite3 test DB
* [x] Uses `mysql2` for production
* [x] `dotenv` support

## Testing

This project uses [Vitest](https://vitest.dev/) for testing.

```bash
npm install
npm run migrate
npm run test
```

## License

[MIT](./LICENSE)
