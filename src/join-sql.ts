import type { Knex } from 'knex'
import type { Row } from './attributes.js'

export interface JoinPlan {
	table: string
	alias: string
	joins: { table: string, alias: string, kind: 'inner' | 'left', on: readonly [string, '=', string], onWhere: Row }[]
	where: { column: string, operator: '=' | '!=' | '<' | '<=' | '>' | '>=', value: unknown }[]
	order: { column: string, direction: 'asc' | 'desc' }[]
	limit?: number
	offset?: number
	projection?: Record<string, string>
}

export const sqlIdentifier = (value: string, qualified = false): string => {
	const parts = value.split('.')
	if ((!qualified && parts.length !== 1) || (qualified && parts.length !== 2) ||
		!parts.every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))) {
		throw new Error(`Invalid SQL identifier: ${value}`)
	}
	return value
}

/** Build a read-only query from validated identifiers and bound values. */
export const buildJoinedQuery = (db: Knex, plan: JoinPlan, count: boolean): Knex.QueryBuilder => {
	const query = db.from({ [plan.alias]: plan.table })
	for (const join of plan.joins) {
		const method = join.kind === 'left' ? 'leftJoin' : 'innerJoin'
		query[method]({ [join.alias]: join.table }, function () {
			this.on(join.on[0], join.on[1], join.on[2])
			for (const [column, value] of Object.entries(join.onWhere)) {
				if (value === null) this.andOnNull(column)
				else this.andOnVal(column, '=', value as Knex.Value)
			}
		})
	}
	for (const filter of plan.where) {
		if (filter.value === null) query.whereNull(filter.column)
		else query.whereRaw(`?? ${filter.operator} ?`, [filter.column, filter.value as Knex.RawBinding])
	}
	if (count) return query.count({ count: '*' })
	if (!plan.projection) throw new Error('Select a projection before reading joined rows')
	query.select(Object.fromEntries(Object.entries(plan.projection).map(([alias, column]) => [alias, column])))
	for (const order of plan.order) query.orderBy(order.column, order.direction)
	if (plan.limit !== undefined) query.limit(plan.limit)
	if (plan.offset !== undefined) query.offset(plan.offset)
	return query
}
