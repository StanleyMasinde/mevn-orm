import type { Row } from './attributes.js'

export interface TableQuery {
	where(conditions: Row): this
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
}

let activeBackend: Backend | undefined

export const setBackend = (backend: Backend): void => {
	activeBackend = backend
}

export const getBackend = (): Backend => {
	if (!activeBackend) {
		throw new Error('Mevn ORM is not configured. Call configureDatabase() or configureDb0() before using Model.')
	}
	return activeBackend
}
