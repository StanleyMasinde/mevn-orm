# What is Mevn ORM?

Mevn ORM is a small **ActiveRecord-style** ORM for Node.js, built on top of [Knex](https://knexjs.org/). It is designed for Express, Nuxt/Nitro, and other ESM apps that want model classes and a simple query API without the surface area of larger frameworks.

## Design goals

- **Thin layer over Knex** — configuration and queries map cleanly to Knex concepts.
- **ActiveRecord feel** — models own their table, CRUD methods, and relationships.
- **TypeScript-first** — static methods preserve derived class types (`User.find()` returns `User | null`).
- **Small API** — enough for everyday CRUD, pagination, and relations; escape hatch via `DB` when you need raw SQL.

## What it exports

| Export | Role |
| --- | --- |
| `Model` | Base class for your tables |
| `ModelCollection` | Array subclass from `all()` / `paginate()`, with `toArray()` |
| `configureDatabase` / `configure` | Database initialisation |
| `HasOneRelation`, `HasManyRelation`, `BelongsToRelation` | Relationship wrappers |
| Migration helpers | `makeMigration`, `migrateLatest`, `migrateRollback`, … |
| `DB` / `getDB()` | Active Knex instance |

## Status

The project is in **maintenance mode**. Core functionality is stable and actively maintained; large new features are limited.

## Requirements

- **Node.js 20+** (ESM runtime)
- **Knex** as a peer dependency
- A database driver for your client (`mysql2`, `pg`, `better-sqlite3`, etc.)

## When to use it

**Good fit when you want:**

- Lightweight models over Knex in an Express or Nuxt backend
- Familiar ActiveRecord patterns (`User.create`, `user.update`, `hasMany`)
- Programmatic migrations without a heavyweight schema DSL

**Consider alternatives when you need:**

- Full graph loading / N+1 prevention strategies
- Complex multi-tenant schema tooling
- Database-agnostic query builders beyond what Knex already provides

## Next steps

- [Getting Started](/guide/getting-started) — install, configure, first model
- [Configuration](/guide/configuration) — clients, connection styles, advanced Knex config
- [API Overview](/api/) — full export reference
