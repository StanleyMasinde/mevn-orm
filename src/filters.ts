import type { Knex } from 'knex'
import type { AttributeColumn, AttributeValue, Row, WhereAttributes } from './attributes.js'

type ComparisonOperator = '=' | '!=' | '<>' | '<' | '<=' | '>' | '>='
type FilterValue<T, K extends AttributeColumn<T>> = AttributeValue<T, K> |
	(Extract<NonNullable<AttributeValue<T, K>>, string> extends never ? never : Date)
type TextColumn<T> = string extends AttributeColumn<T> ? string : {
	[K in AttributeColumn<T>]: Extract<NonNullable<AttributeValue<T, K>>, string> extends never ? never : K
}[AttributeColumn<T>]

type FilterNode =
	| { kind: 'object', conditions: Row }
	| { kind: 'compare', column: string, operator: ComparisonOperator, value: unknown }
	| { kind: 'membership', column: string, values: readonly unknown[], negated: boolean }
	| { kind: 'between', column: string, bounds: readonly [unknown, unknown] }
	| { kind: 'null', column: string, negated: boolean }
	| { kind: 'like', column: string, pattern: string, insensitive: boolean }
	| { kind: 'group', items: readonly FilterItem[] }

interface FilterItem {
	join: 'and' | 'or'
	node: FilterNode
}

type GroupCallback<T> = (query: FilterGroup<T>) => FilterGroup<T> | void

const operators = new Set<ComparisonOperator>(['=', '!=', '<>', '<', '<=', '>', '>='])

/** Escapes literal text for a SQL LIKE pattern. Wrap the result in `%` to search within text. */
const escapeLike = (value: string): string => value.replace(/[!%_]/g, (character) => `!${character}`)

const identifier = (column: string): string => {
	if (!column.split('.').every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))) {
		throw new Error(`Invalid SQL identifier: ${column}`)
	}
	return column
}

const boundValue = (value: unknown): string | number | boolean | bigint | null => {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) throw new RangeError('Invalid Date filter value')
		return value.toISOString().replace('T', ' ').replace('Z', '')
	}
	if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') return value
	if (typeof value === 'number' && Number.isFinite(value)) return value
	throw new TypeError(`Unsupported filter value: ${typeof value}`)
}

const comparison = (column: string, operator: ComparisonOperator, value: unknown): FilterNode => {
	identifier(column)
	if (!operators.has(operator)) throw new Error(`Unsupported comparison operator: ${operator}`)
	if (value === null) throw new TypeError('Use whereNull() or whereNotNull() to compare SQL NULL')
	boundValue(value)
	return { kind: 'compare', column, operator, value }
}

const membership = (column: string, values: readonly unknown[], negated: boolean): FilterNode => {
	identifier(column)
	if (!Array.isArray(values)) throw new TypeError('Membership values must be an array')
	for (const value of values) boundValue(value)
	return { kind: 'membership', column, values: [...values], negated }
}

const between = (column: string, bounds: readonly [unknown, unknown]): FilterNode => {
	identifier(column)
	if (!Array.isArray(bounds) || bounds.length !== 2 || bounds.some((value) => value === null)) {
		throw new TypeError('whereBetween() requires two non-null bounds')
	}
	for (const value of bounds) boundValue(value)
	return { kind: 'between', column, bounds: [bounds[0], bounds[1]] }
}

const nullCheck = (column: string, negated: boolean): FilterNode => ({ kind: 'null', column: identifier(column), negated })

const like = (column: string, pattern: string, insensitive: boolean): FilterNode => {
	identifier(column)
	if (typeof pattern !== 'string') throw new TypeError('LIKE pattern must be a string')
	return { kind: 'like', column, pattern, insensitive }
}

const whereNode = <T>(first: WhereAttributes<T> | string | GroupCallback<T>, operator?: ComparisonOperator, value?: unknown): FilterNode => {
	if (typeof first === 'function') {
		const group = new FilterGroup<T>()
		const result = first(group)
		if (result && typeof result === 'object' && 'then' in result) throw new TypeError('Filter group callback must be synchronous')
		return group.node()
	}
	if (typeof first === 'string') return comparison(first, operator as ComparisonOperator, value)
	if (!first || typeof first !== 'object' || Array.isArray(first)) throw new TypeError('where() requires a conditions object, comparison, or group')
	return { kind: 'object', conditions: first as Row }
}

/** Common typed filtering methods for model queries, relations, and nested groups. */
abstract class FilterBuilder<T> {
	protected abstract addFilter(node: FilterNode): void

	/** The callback form receives a temporary group builder supplied by the ORM. */
	where(conditions: WhereAttributes<T>): this
	where<K extends AttributeColumn<T>>(column: K, operator: ComparisonOperator, value: FilterValue<T, K>): this
	where(group: GroupCallback<T>): this
	where(first: WhereAttributes<T> | string | GroupCallback<T>, operator?: ComparisonOperator, value?: unknown): this {
		this.addFilter(whereNode(first, operator, value))
		return this
	}

	whereIn<K extends AttributeColumn<T>>(column: K, values: readonly FilterValue<T, K>[]): this {
		this.addFilter(membership(column, values, false))
		return this
	}
	whereNotIn<K extends AttributeColumn<T>>(column: K, values: readonly FilterValue<T, K>[]): this {
		this.addFilter(membership(column, values, true))
		return this
	}
	whereBetween<K extends AttributeColumn<T>>(column: K, bounds: readonly [FilterValue<T, K>, FilterValue<T, K>]): this {
		this.addFilter(between(column, bounds))
		return this
	}
	whereNull<K extends AttributeColumn<T>>(column: K): this {
		this.addFilter(nullCheck(column, false))
		return this
	}
	whereNotNull<K extends AttributeColumn<T>>(column: K): this {
		this.addFilter(nullCheck(column, true))
		return this
	}
	whereLike<K extends TextColumn<T>>(column: K, pattern: string): this {
		this.addFilter(like(column, pattern, false))
		return this
	}
	whereILike<K extends TextColumn<T>>(column: K, pattern: string): this {
		this.addFilter(like(column, pattern, true))
		return this
	}
}

/** A group whose OR clauses stay inside the surrounding AND scope. */
class FilterGroup<T> extends FilterBuilder<T> {
	private readonly items: FilterItem[] = []

	protected addFilter(node: FilterNode): void {
		this.items.push({ join: 'and', node })
	}

	node(): FilterNode {
		if (this.items.length === 0) throw new Error('Filter group must contain at least one predicate')
		return { kind: 'group', items: this.items }
	}

	orWhere(conditions: WhereAttributes<T>): this
	orWhere<K extends AttributeColumn<T>>(column: K, operator: ComparisonOperator, value: FilterValue<T, K>): this
	orWhere(group: GroupCallback<T>): this
	orWhere(first: WhereAttributes<T> | string | GroupCallback<T>, operator?: ComparisonOperator, value?: unknown): this {
		this.items.push({ join: 'or', node: whereNode(first, operator, value) })
		return this
	}
	orWhereIn<K extends AttributeColumn<T>>(column: K, values: readonly FilterValue<T, K>[]): this {
		this.items.push({ join: 'or', node: membership(column, values, false) })
		return this
	}
	orWhereNotIn<K extends AttributeColumn<T>>(column: K, values: readonly FilterValue<T, K>[]): this {
		this.items.push({ join: 'or', node: membership(column, values, true) })
		return this
	}
	orWhereBetween<K extends AttributeColumn<T>>(column: K, bounds: readonly [FilterValue<T, K>, FilterValue<T, K>]): this {
		this.items.push({ join: 'or', node: between(column, bounds) })
		return this
	}
	orWhereNull<K extends AttributeColumn<T>>(column: K): this {
		this.items.push({ join: 'or', node: nullCheck(column, false) })
		return this
	}
	orWhereNotNull<K extends AttributeColumn<T>>(column: K): this {
		this.items.push({ join: 'or', node: nullCheck(column, true) })
		return this
	}
	orWhereLike<K extends TextColumn<T>>(column: K, pattern: string): this {
		this.items.push({ join: 'or', node: like(column, pattern, false) })
		return this
	}
	orWhereILike<K extends TextColumn<T>>(column: K, pattern: string): this {
		this.items.push({ join: 'or', node: like(column, pattern, true) })
		return this
	}
}

interface CompiledFilter {
	sql: string
	bindings: unknown[]
}

const compileFilter = (node: FilterNode): CompiledFilter => {
	switch (node.kind) {
	case 'object': {
		const entries = Object.entries(node.conditions)
		if (entries.length === 0) return { sql: '1 = 1', bindings: [] }
		const parts = entries.map(([column, value]) => {
			identifier(column)
			if (value === null) return { sql: '?? IS NULL', bindings: [column] }
			return { sql: '?? = ?', bindings: [column, boundValue(value)] }
		})
		return { sql: `(${parts.map((part) => part.sql).join(' AND ')})`, bindings: parts.flatMap((part) => part.bindings) }
	}
	case 'compare':
		return { sql: `?? ${node.operator} ?`, bindings: [identifier(node.column), boundValue(node.value)] }
	case 'membership': {
		const values = node.values.filter((value) => value !== null)
		const hasNull = values.length !== node.values.length
		if (node.values.length === 0) return { sql: node.negated ? '1 = 1' : '1 = 0', bindings: [] }
		const sql = values.length ? `?? ${node.negated ? 'NOT IN' : 'IN'} (${values.map(() => '?').join(', ')})` : ''
		if (!hasNull) return { sql, bindings: [node.column, ...values.map(boundValue)] }
		if (!values.length) return { sql: `?? IS ${node.negated ? 'NOT ' : ''}NULL`, bindings: [node.column] }
		return {
			sql: `(${sql} ${node.negated ? 'AND' : 'OR'} ?? IS ${node.negated ? 'NOT ' : ''}NULL)`,
			bindings: [node.column, ...values.map(boundValue), node.column],
		}
	}
	case 'between':
		return { sql: '?? BETWEEN ? AND ?', bindings: [node.column, ...node.bounds.map(boundValue)] }
	case 'null':
		return { sql: `?? IS ${node.negated ? 'NOT ' : ''}NULL`, bindings: [node.column] }
	case 'like':
		return node.insensitive
			? { sql: "LOWER(??) LIKE LOWER(?) ESCAPE '!'", bindings: [node.column, node.pattern] }
			: { sql: "?? LIKE ? ESCAPE '!'", bindings: [node.column, node.pattern] }
	case 'group': {
		const parts = node.items.map((item) => compileFilter(item.node))
		return {
			sql: `(${parts.map((part, index) => `${index ? `${node.items[index]?.join.toUpperCase()} ` : ''}${part.sql}`).join(' ')})`,
			bindings: parts.flatMap((part) => part.bindings),
		}
	}
	}
}

const applyFilter = (query: Knex.QueryBuilder, node: FilterNode): void => {
	const { sql, bindings } = compileFilter(node)
	query.whereRaw(sql, bindings as Knex.RawBinding[])
}

export { FilterBuilder, FilterGroup, escapeLike, applyFilter, boundValue }
export type { FilterNode, ComparisonOperator }
