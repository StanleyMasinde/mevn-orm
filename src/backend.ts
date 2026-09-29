import type { Row } from './attributes.js'
import type { FilterNode } from './filters.js'
import type { JoinPlan } from './join-sql.js'
import { currentContext, modelContext } from './execution-context.js'

export interface TableQuery {
	where(conditions: Row): this
	/** Optional extended predicates; existing backend implementations remain valid. */
	filter?(predicate: FilterNode): this
	/** Optional row lock, valid only inside a transaction. */
	lock?(mode: 'update' | 'share'): this
	orderBy(column: string, direction: 'asc' | 'desc'): this
	limit(count: number): this
	offset(count: number): this
	clone(): TableQuery
	select(columns?: string | string[]): Promise<Row[]>
	first(columns?: string | string[]): Promise<Row | null>
	count(column?: string): Promise<number>
	insert(values: Row): Promise<number>
	update(values: Row): Promise<number>
	delete(): Promise<number>
}

export interface Backend {
	query(table: string): TableQuery
	/** Optional read-only join execution; older backends remain valid. */
	joinedRows?(plan: JoinPlan, count: boolean): Promise<Row[] | number>
	/** Optional transaction capability; existing backends remain valid. */
	transaction?<T>(callback: (backend: Backend) => Promise<T>): Promise<T>
}

let activeBackend: Backend | undefined

export const setBackend = (backend: Backend): void => {
	activeBackend = backend
}

export const getBackend = (): Backend => {
	const context = currentContext()
	if (context) {
		context.assertActive()
		return context.backend
	}
	if (!activeBackend) {
		throw new Error('Mevn ORM is not configured. Call configureDatabase() or configureDb0() before using Model.')
	}
	return activeBackend
}

/** A bound model keeps using its transaction, even outside a facade call. */
export const getBackendFor = (model: object): Backend => {
	const context = modelContext(model)
	if (context) {
		context.assertActive()
		return context.backend
	}
	return getBackend()
}
