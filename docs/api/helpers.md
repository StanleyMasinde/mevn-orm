# Helpers

Table-name utilities used by `Model` and available for your own code.

## `toSnakeCase(value: string): string`

Converts PascalCase or camelCase to snake_case.

```ts
import { toSnakeCase } from 'mevn-orm'

toSnakeCase('User')                 // 'user'
toSnakeCase('PasswordResetToken')   // 'password_reset_token'
toSnakeCase('XMLParser')            // depends on acronym handling via implementation
```

## `getTableName(className: string): string`

Pluralised snake_case table name for a model class name.

```ts
import { getTableName } from 'mevn-orm'

getTableName('User')                // 'users'
getTableName('Farm')                // 'farms'
getTableName('PasswordResetToken')  // 'password_reset_tokens'
```

Uses the `pluralize` package for pluralisation after snake_casing.

## Usage outside models

```ts
import { getTableName, getDB } from 'mevn-orm'

function tableFor(ModelClass: { name: string }) {
  return getTableName(ModelClass.name)
}

await getDB()(tableFor(User)).select('*')
```

Prefer `Model.currentTable` / `override table` when working with model subclasses so explicit overrides are respected.
