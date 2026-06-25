import type { Knex } from 'knex'

type Row = Record<string, unknown>

interface RelationshipModel {
	[key: string]: unknown
	modelName: string
	id?: number | string
	stripColumns<T extends Record<string, unknown>>(model: T, keepInternalState?: boolean | undefined): T
}

type RelatedModelCtor<T extends RelationshipModel = RelationshipModel> = new (properties?: Row) => T

/** Base relation wrapper that builds a lazy Knex query against a related model. */
abstract class Relation<TResult, TRelated extends RelationshipModel = RelationshipModel> implements PromiseLike<TResult> {
	protected readonly Related: RelatedModelCtor<TRelated>
	protected readonly query: Knex.QueryBuilder<Row, Row[]> | null

	constructor(Related: RelatedModelCtor<TRelated>, query: Knex.QueryBuilder<Row, Row[]> | null) {
		this.Related = Related
		this.query = query
	}

	/** Appends a `where` constraint to the underlying query builder. */
	where(...args: unknown[]): this {
		this.query?.where(...(args as [never, ...never[]]))
		return this
	}

	/** Executes the relation query and returns the first matching related model. */
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

	/** Executes the relation query and returns all matching related models. */
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

	then<TResult1 = TResult, TResult2 = never>(
		onFulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
		onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.resolve().then(onFulfilled, onRejected)
	}

	protected abstract resolve(): Promise<TResult>
}

class HasOneRelation<T extends RelationshipModel = RelationshipModel> extends Relation<T | null, T> {
	protected resolve(): Promise<T | null> {
		return this.first()
	}
}

class HasManyRelation<T extends RelationshipModel = RelationshipModel> extends Relation<T[], T> {
	protected resolve(): Promise<T[]> {
		return this.get()
	}
}

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