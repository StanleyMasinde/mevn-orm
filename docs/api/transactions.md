# Transactions API

```ts
import { transaction } from 'mevn-orm'

await transaction(async (tx) => {
  const model = tx.model(Item)
  const item = await model.create({ name: 'Desk' })
  await model.where({ id: item.id }).update({ name: 'Standing desk' })
})
```

`transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>` commits when the callback resolves and rolls back when it rejects. It throws before invoking the callback if the configured backend has no transaction capability.

## `TransactionContext`

| Method | Result |
| --- | --- |
| `model(ModelClass)` | `TransactionModel<typeof ModelClass>` facade |
| `bind(model)` | Same model instance, bound to this context |
| `transaction(callback)` | Nested transaction/savepoint where supported |

## `TransactionModel<T>`

The facade mirrors the built-in model static operations: `find`, `findOrFail`, `create`, `createMany`, `firstOrCreate`, `first`, `all`, `count`, `paginate`, `update`, `destroy`, `where`, `orderBy`, `limit`, and `offset`. `query()` starts an unscoped `ModelQuery`; `make(properties?)` constructs a bound instance for `save()`.

Queries created through the facade and models returned by its methods are bound to the same context. Instance writes and existing relations on those models stay in that context. After the callback completes, database operations through the context, queries, or bound models throw. Reading model fields or calling `toArray()` does not access the database and remains available.

`ModelQuery.forUpdate()` and `.forShare()` opt into row locks. They require a live transaction and a backend dialect with row locking. Knex PostgreSQL and MySQL support them; Knex SQLite and db0 reject them before executing a query. Row locks and transaction boundaries do not replace affected-row checks for conditional writes.

See [Transactions](/guide/transactions) for commit, rollback, nesting, and backend examples.
