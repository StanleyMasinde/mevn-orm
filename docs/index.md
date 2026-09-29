---
layout: home

hero:
  name: Mevn ORM
  text: ActiveRecord for Node.js
  tagline: A small, focused ORM for Knex or db0. Define models, query with a fluent API, and ship Express or Nuxt apps.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/StanleyMasinde/mevn-orm

features:
  - title: ActiveRecord models
    details: Extend Model, set fillable and hidden fields, and use create, find, update, and delete with TypeScript-friendly return types.
  - title: Fluent queries
    details: Chain where, orderBy, limit, and offset, then finish with first, all, count, or paginate. Each query keeps its own scope.
  - title: Relationships
    details: hasOne, hasMany, and belongsTo return lazy Promise-like relations you can await directly or chain with where before loading.
  - title: Knex under the hood
    details: Use MySQL, Postgres, SQLite, MSSQL, or Oracle. Drop down to the raw Knex instance whenever you need full SQL control.
  - title: db0 for Nitro
    details: Configure Nitro's database as usual, then pass useDatabase() to Mevn ORM. Knex builds queries and db0 executes them.
  - title: Migrations included
    details: Run Knex migrations from a CLI in development or CI, or on boot in a persistent Nuxt server.
  - title: API-ready serialization
    details: toArray on models and collections strips hidden attributes and ORM internals so responses stay clean.
---
