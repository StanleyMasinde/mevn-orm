import type { Knex } from 'knex'

type Row = Record<string, unknown>

interface RelationshipModel {
	[key: string]: unknown
	modelName: string
	id?: number | string
	stripColumns<T extends Record<string, unknown>>(model: T, keepInternalState?: boolean | undefined): T
}

type RelatedModelCtor<T extends RelationshipModel = RelationshipModel> = new (properties?: Row) => T

/**
 * Lazy relation query wrapper backed by Knex.
 *
 * Relation instances are {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise | Promise-like}:
 * `await farmer.profile()` auto-executes the query. Chain `where()` before awaiting
 * to refine the query, or call `first()` / `get()` explicitly.
 */
abstract class Relation<TResult, TRelated extends RelationshipModel = RelationshipModel> implements PromiseLike<TResult> {
	protected readonly Related: RelatedModelCtor<TRelated>
	protected readonly query: Knex.QueryBuilder<Row, Row[]> | null

	constructor(Related: RelatedModelCtor<TRelated>, query: Knex.QueryBuilder<Row, Row[]> | null) {
		this.Related = Related
		this.query = query
	}

	/**
	 * Appends a `where` constraint to the underlying Knex query.
	 *
	 * @param args - Knex `where` arguments (object or column/value pairs).
	 * @returns This relation instance for chaining.
	 */
	where(...args: unknown[]): this {
		this.query?.where(...(args as [never, ...never[]]))
		return this
	}

	/**
	 * Executes the relation query and returns the first matching related model.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Related model instance, or `null` when no row matches.
	 */
	async first(columns: string | string[] = '*'): Promise<TRelated | null> {
		if (!this.query) {
			return null
		}

		const row = await this.query.first<Row>(columns as never)
		if (!row) {
			return null
		}

		const related = new this.Related(row)
		return related.stripColumns(related)
	}

	/**
	 * Executes the relation query and returns all matching related models.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Array of related model instances (empty when no rows match).
	 */
	async get(columns: string | string[] = '*'): Promise<TRelated[]> {
		if (!this.query) {
			return []
		}

		const rows = await this.query.select<Row[]>(columns as never)
		return rows.map((row) => {
			const related = new this.Related(row)
			return related.stripColumns(related)
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
	type Row,
}