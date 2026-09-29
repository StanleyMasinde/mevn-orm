# Transactions

Use `transaction()` when several model operations must commit or roll back together. It passes an explicit context to the callback; `tx.model(ModelClass)` returns a facade whose reads, writes, reloads, and queries use the same database transaction.

```ts
import { transaction } from 'mevn-orm'

await transaction(async (tx) => {
  const item = await tx.model(Item).create({ name: 'Desk' })
  await tx.model(ItemNote).create({ item_id: item.id, body: 'Created' })

  const notes = await item.notes() // Relation reads through the same transaction
  const found = await tx.model(Item).find(item.id)
})
```

An error thrown by the callback rolls back all writes. The `create()` reload and subsequent model reads see writes made earlier in that transaction. `save()` keeps its insert-and-reload behavior, `createMany()` remains sequential, and existing relation return shapes and hidden-field rules are unchanged.

## Bound models and queries

The facade supports `find`, `findOrFail`, `create`, `createMany`, `firstOrCreate`, `first`, `all`, `count`, `paginate`, `update`, `destroy`, `where`, `orderBy`, `limit`, `offset`, and `query`. Its query methods return the normal `ModelQuery`, including filters and pagination. Models returned by the facade or its queries remain bound to the transaction for instance `update()`, `delete()`, and relationships.

For a new instance, use `tx.model(Item).make(properties)` before `save()`, or bind an existing instance with `tx.bind(item)`. Both return the same model type. Static calls such as `Item.find()` outside the facade continue to use the globally configured backend; the transaction does not replace that configuration.

```ts
await transaction(async (tx) => {
  const item = tx.model(Item).make({ name: 'Lamp' })
  await item.save()

  const page = await tx.model(Item).where({ active: true }).paginate(20, 1)
  const changed = await tx.model(Item).where({ id: item.id }).update({ name: 'Desk lamp' })
  if (changed !== 1) throw new Error('Item changed or disappeared')
})
```

A transaction alone does not prevent races. For conditional changes, check affected row counts and use suitable predicates. Row locking is optional: `tx.model(Item).where({ id }).forUpdate().first()` and `.forShare()` require a transaction and work with Knex's PostgreSQL and MySQL dialects. SQLite and db0 reject row locking before executing a query.

## Nesting and lifetime

Use `tx.transaction(async (inner) => ...)` for a nested Knex transaction. Knex uses a savepoint: rolling back the inner callback can leave the outer transaction active. Calling the top-level `transaction()` function inside the callback starts a separate transaction; use `tx.transaction()` when nesting is intended.

The context ends when its callback resolves or rejects. A bound model can still be inspected or serialized afterward, but database methods and relations on it throw `Transaction context has completed`. A query or facade kept past that point also throws. Models from an inner savepoint expire when that inner callback completes, even while the outer transaction remains active. Bind an unbound model deliberately; one already bound to a different context cannot be rebound.

Await every database operation before the callback returns. Work left running after the callback ends cannot use the completed context.

## Backend support

The Knex backend supports transaction-bound model operations. Its PostgreSQL and MySQL dialects also support `forUpdate()` and `forShare()`; SQLite does not support those row locks. The current db0 `Database` API does not expose a connection-bound transaction callback, so `transaction()` with `configureDb0()` rejects before running the callback. Existing db0 operations remain available. Custom backends can opt in through the optional `Backend.transaction` capability; existing implementations remain valid. No migration or global backend change is required.
