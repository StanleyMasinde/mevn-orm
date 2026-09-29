import type { AttributeColumn, ModelAttributes, Row } from './attributes.js'
import { getBackend, type Backend } from './backend.js'
import { currentContext, type ExecutionContext } from './execution-context.js'
import { boundValue } from './filters.js'
import { sqlIdentifier, type JoinPlan } from './join-sql.js'
import { Model } from './model.js'

type Source<T extends Model, Nullable extends boolean> = { model: T, nullable: Nullable }
type Sources = Record<string, Source<Model, boolean>>
type ColumnRef<S extends Sources> = {
	[A in keyof S & string]: `${A}.${AttributeColumn<S[A]['model']>}`
}[keyof S & string]
type ColumnValue<S extends Sources, C extends string> = C extends `${infer A}.${infer K}`
	? A extends keyof S
		? K extends keyof ModelAttributes<S[A]['model']>
			? ModelAttributes<S[A]['model']>[K] | (S[A]['nullable'] extends true ? null : never)
			: unknown
		: never
	: never
type ProjectedRow<S extends Sources, P extends Record<string, string>> = {
	[K in keyof P]: ColumnValue<S, P[K]>
}
type JoinOperator = '=' | '!=' | '<' | '<=' | '>' | '>='

const clonePlan = (plan: JoinPlan): JoinPlan => ({
	...plan,
	joins: plan.joins.map((join) => ({ ...join, on: [...join.on] as [string, '=', string], onWhere: { ...join.onWhere } })),
	where: plan.where.map((filter) => ({ ...filter })),
	order: plan.order.map((order) => ({ ...order })),
	...(plan.projection ? { projection: { ...plan.projection } } : {}),
})

/** Opt-in, read-only query that returns plain rows instead of hydrated models. */
class JoinQuery<S extends Sources, P extends Record<string, string> | undefined = undefined> {
	constructor(
		private readonly backend: Backend,
		private readonly plan: JoinPlan,
		private readonly context?: ExecutionContext,
	) {}

	clone(): JoinQuery<S, P> {
		return new JoinQuery(this.backend, clonePlan(this.plan), this.context)
	}

	private addJoin<R extends typeof Model, A extends string, N extends boolean>(
		kind: 'inner' | 'left', Related: R,
		options: { as: A, on: readonly [ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, N>>>, '=', ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, N>>>], onWhere?: Row },
	): JoinQuery<S & Record<A, Source<InstanceType<R>, N>>, P> {
		const table = Related.resolveTable()
		sqlIdentifier(table)
		sqlIdentifier(options.as)
		if ([this.plan.alias, ...this.plan.joins.map((join) => join.alias)].includes(options.as)) {
			throw new Error(`Duplicate table alias: ${options.as}`)
		}
		for (const column of options.on.slice(0, 3).filter((part) => part !== '=')) sqlIdentifier(column, true)
		const onWhere = options.onWhere ?? {}
		for (const column of Object.keys(onWhere)) {
			sqlIdentifier(column, true)
			if (!column.startsWith(`${options.as}.`)) throw new Error(`ON predicate must use joined alias ${options.as}: ${column}`)
		}
		const next = clonePlan(this.plan)
		next.joins.push({ table, alias: options.as, kind, on: options.on,
			onWhere: Object.fromEntries(Object.entries(onWhere).map(([column, value]) => [column, value === null ? null : boundValue(value)])) })
		return new JoinQuery(this.backend, next, this.context)
	}

	innerJoin<R extends typeof Model, A extends string>(Related: R, options: {
		as: A, on: readonly [ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, false>>>, '=', ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, false>>>], onWhere?: Row
	}): JoinQuery<S & Record<A, Source<InstanceType<R>, false>>, P> {
		return this.addJoin<R, A, false>('inner', Related, options)
	}

	leftJoin<R extends typeof Model, A extends string>(Related: R, options: {
		as: A, on: readonly [ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, true>>>, '=', ColumnRef<S & Record<NoInfer<A>, Source<InstanceType<R>, true>>>], onWhere?: Row
	}): JoinQuery<S & Record<A, Source<InstanceType<R>, true>>, P> {
		return this.addJoin<R, A, true>('left', Related, options)
	}

	where<C extends ColumnRef<S>>(column: C, operator: JoinOperator, value: ColumnValue<S, C>): this {
		sqlIdentifier(column, true)
		if (!['=', '!=', '<', '<=', '>', '>='].includes(operator)) throw new Error(`Unsupported comparison operator: ${operator}`)
		if (value === null && operator !== '=') throw new TypeError('Use equality to filter SQL NULL')
		this.plan.where.push({ column, operator, value: value === null ? null : boundValue(value) })
		return this
	}

	orderBy<C extends ColumnRef<S>>(column: C, direction: 'asc' | 'desc' = 'asc'): this {
		sqlIdentifier(column, true)
		if (direction !== 'asc' && direction !== 'desc') throw new Error(`Invalid sort direction: ${direction}`)
		this.plan.order.push({ column, direction })
		return this
	}

	limit(count: number): this {
		if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('limit must be a non-negative integer')
		this.plan.limit = count
		return this
	}

	offset(count: number): this {
		if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('offset must be a non-negative integer')
		this.plan.offset = count
		return this
	}

	project<Q extends Record<string, ColumnRef<S>>>(columns: Q): JoinQuery<S, Q> {
		if (Object.keys(columns).length === 0) throw new Error('Projection requires at least one column')
		for (const [alias, column] of Object.entries(columns)) {
			sqlIdentifier(alias)
			sqlIdentifier(column, true)
			const source = column.split('.')[0]
			if (![this.plan.alias, ...this.plan.joins.map((join) => join.alias)].includes(source!)) throw new Error(`Unknown table alias: ${source}`)
		}
		const next = clonePlan(this.plan)
		next.projection = { ...columns }
		return new JoinQuery(this.backend, next, this.context)
	}

	async rows(): Promise<P extends Record<string, string> ? ProjectedRow<S, P>[] : never> {
		this.context?.assertActive()
		if (!this.backend.joinedRows) throw new Error('This backend does not support joined rows')
		return await this.backend.joinedRows(clonePlan(this.plan), false) as P extends Record<string, string> ? ProjectedRow<S, P>[] : never
	}

	/** Counts joined rows before limit and offset, including repeated parent rows. */
	async count(): Promise<number> {
		this.context?.assertActive()
		if (!this.backend.joinedRows) throw new Error('This backend does not support joined rows')
		return await this.backend.joinedRows(clonePlan(this.plan), true) as number
	}

	async paginate(perPage = 15, page = 1): Promise<{
		data: P extends Record<string, string> ? ProjectedRow<S, P>[] : never
		total: number, per_page: number, current_page: number, next_page: number | null, prev_page: number | null, last_page: number
	}> {
		if (!Number.isSafeInteger(perPage) || perPage <= 0) throw new RangeError('perPage must be a positive integer')
		if (!Number.isSafeInteger(page) || page <= 0) throw new RangeError('page must be a positive integer')
		const total = await this.count()
		const lastPage = Math.max(1, Math.ceil(total / perPage))
		const currentPage = Math.min(page, lastPage)
		const data = await this.clone().limit(perPage).offset((currentPage - 1) * perPage).rows()
		return { data, total, per_page: perPage, current_page: currentPage,
			next_page: currentPage < lastPage ? currentPage + 1 : null,
			prev_page: currentPage > 1 ? currentPage - 1 : null, last_page: lastPage }
	}
}

/** Start an isolated join projection without adding names to Model subclasses. */
const joinRows = <T extends typeof Model, A extends string>(ModelClass: T, alias: A): JoinQuery<Record<A, Source<InstanceType<T>, false>>> => {
	const table = ModelClass.resolveTable()
	sqlIdentifier(table)
	sqlIdentifier(alias)
	return new JoinQuery(getBackend(), { table, alias, joins: [], where: [], order: [] }, currentContext())
}

export { JoinQuery, joinRows }
