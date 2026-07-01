import pluralize from 'pluralize'

/**
 * Converts a PascalCase or camelCase identifier to snake_case.
 *
 * @param value - Class or property name (e.g. `PasswordResetToken`).
 * @returns Snake_case equivalent (e.g. `password_reset_token`).
 *
 * @example
 * ```ts
 * toSnakeCase('PasswordResetToken') // 'password_reset_token'
 * toSnakeCase('User')               // 'user'
 * ```
 */
const toSnakeCase = (value: string): string =>
	value
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
		.toLowerCase()

/**
 * Resolves the pluralised snake_case table name for a model class name.
 *
 * @param className - Model class name (e.g. `User`, `PasswordResetToken`).
 * @returns Pluralised table name (e.g. `users`, `password_reset_tokens`).
 *
 * @example
 * ```ts
 * getTableName('User')               // 'users'
 * getTableName('PasswordResetToken') // 'password_reset_tokens'
 * ```
 */
const getTableName = (className: string): string => pluralize(toSnakeCase(className))

export { toSnakeCase, getTableName }