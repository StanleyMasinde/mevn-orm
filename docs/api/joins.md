# Joined-row API

Use `joinRows()` to read selected columns across model tables as plain, typed rows. For example, joining `Farmer` to `Farm` produces one row per matching farm; a left join also produces a row with `null` farm fields for a farmer with no farm. See [Read joined rows](/guide/joined-rows) for the complete Farmer, Profile, and Farm example.

## `joinRows(ModelClass, alias)`

Starts an independent `JoinQuery` for `ModelClass`'s resolved table. `alias` must be one valid SQL identifier. The function is exported from both `mevn-orm` and `mevn-orm/db0`. It throws if the ORM is not configured or the table or alias is invalid.

## Join and scope methods

The following methods return a `JoinQuery`. A join or projection returns a new query; `where`, `orderBy`, `limit`, and `offset` change the query on which you call them. Use `clone()` to branch that scope.

| Method | Effect |
| --- | --- |
| `innerJoin(Related, { as, on, onWhere? })` | Keep rows with a matching related row. |
| `leftJoin(Related, { as, on, onWhere? })` | Keep unmatched left rows and project unmatched right values as `null`. |
| `where(column, operator, value)` | Add a qualified column filter. Operators: `=`, `!=`, `<`, `<=`, `>`, `>=`. Use `=` with `null` for `IS NULL`. |
| `orderBy(column, direction?)` | Sort by a qualified column. Direction defaults to `asc`. |
| `limit(count)` / `offset(count)` | Restrict or skip rows. Counts must be non-negative safe integers. |
| `project({ outputKey: 'alias.column' })` | Select columns under explicit result keys. At least one column is required. |
| `clone()` | Copy the joins, filters, ordering, range, and projection. |

The `on` tuple has the form `['leftAlias.column', '=', 'rightAlias.column']`. `onWhere` is an optional equality object whose keys must use the joined alias. Both options place their conditions in SQL `ON`. Alias names must be unique within a query. Table and output aliases must be simple SQL identifiers; source columns must use `alias.column`.

## Terminal methods

| Method | Returns |
| --- | --- |
| `rows()` | An array of projected plain objects; requires `project()`. |
| `count()` | The number of filtered joined rows before `limit` and `offset`; projection is optional. |
| `paginate(perPage?, page?)` | `{ data, total, per_page, current_page, next_page, prev_page, last_page }`, where `data` is projected plain rows. Defaults to 15 rows on page 1. |

`paginate()` requires a projection and rejects a non-positive or unsafe page size or page number. It clamps pages beyond the end to the last page. `count()` and pagination totals include duplicate parent rows created by one-to-many joins.

The Knex backend and db0's supported SQLite and MySQL connectors implement this read-only path. A third-party backend may add the optional `Backend.joinedRows(plan, count)` capability; missing support throws when a terminal method runs. Existing backend interfaces and model query methods retain their behaviour.
