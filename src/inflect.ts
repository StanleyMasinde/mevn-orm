import pluralize from 'pluralize'

/** Converts PascalCase/camelCase identifiers to snake_case. */
const toSnakeCase = (value: string): string =>
	value
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
		.toLowerCase()

/** Resolves the pluralized snake_case table name for a model class name. */
const getTableName = (className: string): string => pluralize(toSnakeCase(className))

export { toSnakeCase, getTableName }