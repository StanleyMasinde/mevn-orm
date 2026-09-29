import type { AttributeColumn, Row } from './attributes.js'
import type { TableQuery } from './backend.js'
import { FilterBuilder, type FilterNode } from './filters.js'
import { bindModel, type ExecutionContext } from './execution-context.js'

interface RelationshipModel {
	[key: string]: unknown
	modelName: string
	id?: number | string
	stripColumns<T extends Record<string, unknown>>(model: T, keepInternalState?: boolean | undefined): T
}

type RelatedModelCtor<T extends RelationshipModel = RelationshipModel> = new (properties?: Row) => T

/** Pagination metadata for a relation, with its existing array result shape. */
interface RelationPaginatedResult<T extends RelationshipModel> {
	data: T[]
	total: number
	per_page: number
	current_page: number
	next_page: number | null
	prev_page: number | null
	last_page: number
}

/**
 * Lazy relation query wrapper backed by the configured database.
 *
 * Relation instances are {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise | Promise-like}:
 * `await farmer.profile()` auto-executes the query. Chain `where()` before awaiting
 * to refine the query, or call `first()` / `get()` explicitly.
 */
abstract class Relation<TResult, TRelated extends RelationshipModel = RelationshipModel> extends FilterBuilder<TRelated> implements PromiseLike<TResult> {
	protected readonly Related: RelatedModelCtor<TRelated>
	protected readonly query: TableQuery | null
	protected readonly context: ExecutionContext | undefined

	constructor(Related: RelatedModelCtor<TRelated>, query: TableQuery | null, context?: ExecutionContext) {
		super()
		this.Related = Related
		this.query = query
		this.context = context
	}

	/**
	 * Appends equality conditions to the relation query.
	 *
	 * Object form is typed from the related model's declared columns.
	 *
	 * @returns This relation instance for chaining.
	 */
	protected addFilter(node: FilterNode): void {
		this.context?.assertActive()
		if (!this.query) return
		if (node.kind === 'object') {
			this.query.where(node.conditions)
			return
		}
		if (!this.query.filter) throw new Error('This backend does not support extended filters')
		this.query.filter(node)
	}

	/** Orders related rows while retaining the parent key constraint. */
	orderBy(column: AttributeColumn<TRelated>, direction: 'asc' | 'desc' = 'asc'): this {
		this.context?.assertActive()
		this.query?.orderBy(column, direction)
		return this
	}

	/** Limits related rows. */
	limit(count: number): this {
		this.context?.assertActive()
		this.query?.limit(count)
		return this
	}

	/** Skips related rows. */
	offset(count: number): this {
		this.context?.assertActive()
		this.query?.offset(count)
		return this
	}

	/** Counts all rows matching the relation scope, ignoring order, limit, and offset. */
	async count(column = '*'): Promise<number> {
		this.context?.assertActive()
		return this.query ? this.query.count(column) : 0
	}

	/** Returns relation rows and the same page metadata used by model queries. */
	async paginate(perPage = 15, page = 1, columns: string | string[] = '*'): Promise<RelationPaginatedResult<TRelated>> {
		this.context?.assertActive()
		if (!Number.isSafeInteger(perPage) || perPage <= 0) throw new RangeError('perPage must be a positive integer')
		if (!Number.isSafeInteger(page) || page <= 0) throw new RangeError('page must be a positive integer')
		const total = await this.count()
		const lastPage = Math.max(1, Math.ceil(total / perPage))
		const currentPage = Math.min(page, lastPage)
		const rows = this.query
			? await this.query.clone().limit(perPage).offset((currentPage - 1) * perPage).select(columns)
			: []
		const data = rows.map((row) => {
			const related = new this.Related(row)
			return bindModel(related.stripColumns(related), this.context)
		})
		return {
			data,
			total,
			per_page: perPage,
			current_page: currentPage,
			next_page: currentPage < lastPage ? currentPage + 1 : null,
			prev_page: currentPage > 1 ? currentPage - 1 : null,
			last_page: lastPage,
		}
	}

	/**
	 * Executes the relation query and returns the first matching related model.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Related model instance, or `null` when no row matches.
	 */
	async first(columns: string | string[] = '*'): Promise<TRelated | null> {
		this.context?.assertActive()
		if (!this.query) {
			return null
		}

		const row = await this.query.first(columns)
		if (!row) {
			return null
		}

		const related = new this.Related(row)
		return bindModel(related.stripColumns(related), this.context)
	}

	/**
	 * Executes the relation query and returns all matching related models.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Array of related model instances (empty when no rows match).
	 */
	async get(columns: string | string[] = '*'): Promise<TRelated[]> {
		this.context?.assertActive()
		if (!this.query) {
			return []
		}

		const rows = await this.query.select(columns)
		return rows.map((row) => {
			const related = new this.Related(row)
			return bindModel(related.stripColumns(related), this.context)
		})
	}

	/**
	 * Allows `await relation` without calling `first()` or `get()` explicitly.
	 *
	 * @param onFulfilled - Success callback.
	 * @param onRejected - Error callback.
	 */
	then<TResult1 = TResult, TResult2 = never>(
		onFulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
		onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.resolve().then(onFulfilled, onRejected)
	}

	protected abstract resolve(): Promise<TResult>
}

/**
 * One-to-one relation. Awaiting resolves to a single related model or `null`.
 *
 * @typeParam T - Related model instance type.
 */
class HasOneRelation<T extends RelationshipModel = RelationshipModel> extends Relation<T | null, T> {
	protected resolve(): Promise<T | null> {
		return this.first()
	}
}

/**
 * One-to-many relation. Awaiting resolves to an array of related models.
 *
 * @typeParam T - Related model instance type.
 */
class HasManyRelation<T extends RelationshipModel = RelationshipModel> extends Relation<T[], T> {
	protected resolve(): Promise<T[]> {
		return this.get()
	}
}

/**
 * Inverse belongs-to relation. Awaiting resolves to the parent model or `null`.
 *
 * @typeParam T - Related model instance type.
 */
class BelongsToRelation<T extends RelationshipModel = RelationshipModel> extends Relation<T | null, T> {
	protected resolve(): Promise<T | null> {
		return this.first()
	}
}

export {
	Relation,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
	type RelationshipModel,
	type RelatedModelCtor,
	type RelationPaginatedResult,
	type Row,
}
