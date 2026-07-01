import type { Knex } from 'knex'
import { getDB } from './config.js'
import { getTableName, toSnakeCase } from './inflect.js'
import { BelongsToRelation, HasManyRelation, HasOneRelation } from './relation.js'
import { createRelationshipMethods } from './relationships.js'

type Row = Record<string, unknown>

/**
 * Paginated query result returned by {@link Model.paginate}.
 *
 * @typeParam T - Model instance type contained in `data`.
 */
interface PaginatedResult<T extends Model> {
	/** Model instances for the current page. */
	data: ModelCollection<T>
	/** Total rows matching the scoped query across all pages. */
	total: number
	/** Requested page size. */
	per_page: number
	/** Current page number (1-based). */
	current_page: number
	/** Next page number, or `null` on the last page. */
	next_page: number | null
	/** Previous page number, or `null` on the first page. */
	prev_page: number | null
	/** Total number of pages. */
	last_page: number
}

const DEFAULT_PER_PAGE = 15

/**
 * Array subclass returned by {@link Model.all} and {@link Model.paginate}.
 *
 * Extends `Array` so it remains compatible with array operations while adding
 * {@link ModelCollection.toArray | toArray()} for API serialisation.
 *
 * @typeParam T - Model instance type stored in the collection.
 */
class ModelCollection<T extends Model> extends Array<T> {
	/**
	 * Serialises every model in the collection to a plain object.
	 *
	 * @returns Array of serialised records (respects each model's `hidden` fields).
	 */
	toArray(): Row[] {
		return this.map((model) => model.toArray())
	}
}

const toError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error
	}

	return new Error(String(error))
}

/**
 * ActiveRecord-style base model backed by Knex.
 *
 * Extend this class for each database table. Table names are inferred from the
 * class name unless overridden via `override table`. Use static methods for
 * queries and instance methods for row-level persistence.
 *
 * @example
 * ```ts
 * class User extends Model {
 *   override fillable = ['name', 'email', 'password']
 *   override hidden = ['password']
 * }
 *
 * const user = await User.create({ name: 'Jane', email: 'jane@example.com' })
 * const page = await User.orderBy('name').paginate(10)
 * ```
 */
class Model {
	[key: string]: any

	#private: string[]

	/**
	 * Resolved database table name for this model class.
	 *
	 * Honours subclass `override table` declarations.
	 */
	static get currentTable(): string {
		return this.resolveTable()
	}

	/**
	 * Active scoped Knex query built by `where()`, `orderBy()`, and other chain methods.
	 *
	 * Consumed and reset by terminal methods such as `first()`, `all()`, and `paginate()`.
	 */
	static currentQuery: Knex.QueryBuilder<Row, Row[]> | undefined

	/**
	 * Resolves the database table name for this model class.
	 *
	 * Instantiates the subclass to read its `table` property, so explicit
	 * `override table` values are honoured on static query paths.
	 *
	 * @returns Resolved table name.
	 */
	static resolveTable(this: typeof Model): string {
		return new this().table
	}

	/**
	 * Returns the active scoped query, initialising one against the model table when absent.
	 *
	 * Used internally by chain methods like `orderBy()` when called without a prior `where()`.
	 */
	static ensureCurrentQuery(this: typeof Model): Knex.QueryBuilder<Row, Row[]> {
		if (!this.currentQuery) {
			const table = this.resolveTable()
			this.currentQuery = getDB()(table) as Knex.QueryBuilder<Row, Row[]>
		}

		return this.currentQuery
	}

	/** Attributes allowed through {@link Model.save | save()} mass assignment. */
	fillable: string[]

	/** Attributes excluded from {@link Model.toArray | toArray()} and stripped after reads. */
	hidden: string[]

	/** Snake_case singular name derived from the class name (used for default foreign keys). */
	modelName: string

	/** Database table this model maps to. Override when inference does not match your schema. */
	table: string

	/** Primary key value, set after insert or load. */
	id?: number

	/**
	 * Creates a model instance from a database row or plain object.
	 *
	 * @param properties - Initial attribute values.
	 */
	constructor(properties: Row = {}) {
		Object.assign(this, properties)
		this.fillable = []
		this.hidden = []
		this.#private = ['fillable', 'hidden']
		this.modelName = toSnakeCase(this.constructor.name)
		this.table = getTableName(this.constructor.name)
	}

	/**
	 * Inserts the current model using {@link Model.fillable | fillable} attributes and reloads it.
	 *
	 * @returns This instance with database-assigned fields (including `id`) populated.
	 */
	async save(): Promise<this> {
		try {
			const rows: Row = {}
			for (const field of this.fillable) {
				rows[field] = this[field]
			}

			const inserted = await getDB()(this.table).insert(rows)
			const idValue = Array.isArray(inserted) ? inserted[0] : inserted
			const id = typeof idValue === 'bigint' ? Number(idValue) : Number(idValue)
			const fields = await getDB()(this.table).where({ id }).first<Row>()

			if (!fields) {
				throw new Error(`Failed to load inserted record for table "${this.table}"`)
			}

			Object.assign(this, fields)
			this.id = id
			return this.stripColumns(this, true)
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Updates the current row by primary key and returns a refreshed model instance.
	 *
	 * @param properties - Columns and values to update.
	 * @returns Refreshed instance with updated attributes.
	 * @throws When the instance has no `id`.
	 */
	async update(properties: Row): Promise<this> {
		if (this.id === undefined) {
			throw new Error('Cannot update model without id')
		}

		try {
			await getDB()(this.table).where({ id: this.id }).update(properties)
			const fields = await getDB()(this.table).where({ id: this.id }).first<Row>()

			if (!fields) {
				throw new Error(`Failed to load updated record for table "${this.table}"`)
			}

			const next = new (this.constructor as new (props: Row) => this)(fields)
			return this.stripColumns(next)
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Deletes the current row by primary key.
	 *
	 * @throws When the instance has no `id`.
	 */
	async delete(): Promise<void> {
		if (this.id === undefined) {
			throw new Error('Cannot delete model without id')
		}

		try {
			await getDB()(this.table).where({ id: this.id }).del()
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Bulk-updates rows in the model table.
	 *
	 * When preceded by {@link Model.where | where()}, only scoped rows are updated.
	 * The query scope is reset after execution.
	 *
	 * @param properties - Columns and values to update.
	 * @returns Number of rows updated.
	 */
	static async update(properties: Row): Promise<number | undefined> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			return await query.update(properties)
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Bulk-deletes rows in the model table.
	 *
	 * When preceded by {@link Model.where | where()}, only scoped rows are deleted.
	 * The query scope is reset after execution.
	 *
	 * @returns Number of rows deleted.
	 */
	static async destroy(): Promise<number | undefined> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			return await query.delete()
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Finds a single model by primary key.
	 *
	 * @param id - Primary key value.
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Model instance, or `null` when not found. Preserves the derived class type.
	 */
	static async find<T extends typeof Model>(this: T, id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		const table = this.resolveTable()

		try {
			const fields = await getDB()(table).where({ id }).first<Row>(columns as never)
			return fields ? new this(fields) as InstanceType<T> : null
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Finds a model by primary key or throws when it does not exist.
	 *
	 * @param id - Primary key value.
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Model instance. Preserves the derived class type.
	 * @throws When no row matches the given id.
	 */
	static async findOrFail<T extends typeof Model>(this: T, id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T>> {
		const found = await this.find(id, columns)
		if (!found) {
			throw new Error(`${this.name} with id "${id}" not found`)
		}

		return found
	}

	/**
	 * Inserts a row and returns the created model instance.
	 *
	 * @param properties - Column values to insert.
	 * @returns Created model with `hidden` fields stripped. Preserves the derived class type.
	 */
	static async create<T extends typeof Model>(this: T, properties: Row): Promise<InstanceType<T>> {
		const table = this.resolveTable()

		try {
			const inserted = await getDB()(table).insert(properties)
			const idValue = Array.isArray(inserted) ? inserted[0] : inserted
			const id = typeof idValue === 'bigint' ? Number(idValue) : Number(idValue)
			const record = await getDB()(table).where({ id }).first<Row>()

			if (!record) {
				throw new Error(`Failed to load created record for table "${table}"`)
			}

			const model = new this(record) as InstanceType<T>
			return model.stripColumns(model)
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Inserts multiple rows sequentially and returns created model instances.
	 *
	 * @param properties - Array of column value objects to insert.
	 * @returns Created model instances in insertion order.
	 */
	static async createMany<T extends typeof Model>(this: T, properties: Row[]): Promise<InstanceType<T>[]> {
		if (properties.length === 0) {
			return []
		}

		try {
			const records: InstanceType<T>[] = []
			for (const property of properties) {
				records.push(await this.create(property))
			}
			return records
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Returns the first row matching `attributes`, or creates one with merged values.
	 *
	 * @param attributes - Lookup conditions.
	 * @param values - Additional values used only when creating a new row.
	 * @returns Existing or newly created model instance.
	 */
	static async firstOrCreate<T extends typeof Model>(this: T, attributes: Row, values: Row = {}): Promise<InstanceType<T>> {
		const table = this.resolveTable()
		try {
			const record = await getDB()(table).where(attributes).first<Row>()
			if (record) {
				const model = new this(record) as InstanceType<T>
				return model.stripColumns(model)
			}

			return this.create({ ...attributes, ...values })
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Starts a scoped query with a `where` clause.
	 *
	 * Chain further constraints (`orderBy`, `limit`, …) then call a terminal method
	 * (`first`, `all`, `paginate`, `count`, `update`, `destroy`).
	 *
	 * @param conditions - Equality conditions passed to Knex `where`.
	 * @returns Model constructor for chaining.
	 */
	static where<T extends typeof Model>(this: T, conditions: Row = {}): T {
		const table = this.resolveTable()
		this.currentQuery = getDB()(table).where(conditions) as Knex.QueryBuilder<Row, Row[]>
		return this
	}

	/**
	 * Appends an `orderBy` clause to the current scoped query.
	 *
	 * @param column - Column to sort by.
	 * @param direction - Sort direction (`'asc'` or `'desc'`). Defaults to `'asc'`.
	 * @returns Model constructor for chaining.
	 */
	static orderBy<T extends typeof Model>(this: T, column: string, direction: 'asc' | 'desc' = 'asc'): T {
		this.ensureCurrentQuery().orderBy(column, direction)
		return this
	}

	/**
	 * Appends a `limit` clause to the current scoped query.
	 *
	 * @param count - Maximum number of rows to return.
	 * @returns Model constructor for chaining.
	 */
	static limit<T extends typeof Model>(this: T, count: number): T {
		this.ensureCurrentQuery().limit(count)
		return this
	}

	/**
	 * Appends an `offset` clause to the current scoped query.
	 *
	 * @param count - Number of rows to skip (commonly paired with {@link Model.limit | limit()}).
	 * @returns Model constructor for chaining.
	 */
	static offset<T extends typeof Model>(this: T, count: number): T {
		this.ensureCurrentQuery().offset(count)
		return this
	}

	/**
	 * Returns the first model matching the current scope.
	 *
	 * When no scope is active, returns the first row in the table.
	 * The query scope is reset after execution.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns First matching model, or `null` when none found.
	 */
	static async first<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const rows = await query.first<Row>(columns as never)
			return rows ? new this(rows) as InstanceType<T> : null
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Returns all models matching the current scope.
	 *
	 * When no scope is active, returns every row in the table.
	 * The query scope is reset after execution.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns {@link ModelCollection} of matching models.
	 */
	static async all<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<ModelCollection<InstanceType<T>>> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const rows = await query.select<Row[]>(columns as never)
			const collection = new ModelCollection<InstanceType<T>>()
			for (const row of rows) {
				collection.push(new this(row) as InstanceType<T>)
			}

			return collection
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Returns a paginated result set for the current scope.
	 *
	 * Runs a count query and a data query against the scoped builder.
	 * The query scope is reset after execution.
	 *
	 * @param perPage - Items per page (default `15`).
	 * @param page - Page number, 1-based (default `1`).
	 * @param columns - Columns to select (default `'*'`).
	 * @returns Paginated data and metadata.
	 *
	 * @example
	 * ```ts
	 * const result = await Post.where({ published: true }).orderBy('created_at', 'desc').paginate(10, 2)
	 * ```
	 */
	static async paginate<T extends typeof Model>(
		this: T,
		perPage = DEFAULT_PER_PAGE,
		page = 1,
		columns: string | string[] = '*',
	): Promise<PaginatedResult<InstanceType<T>>> {
		try {
			const table = this.resolveTable()
			const baseQuery = this.currentQuery ?? getDB()(table)
			const countResult = await baseQuery.clone().count<{ count: string | number }>({ count: '*' }).first()
			const total = countResult ? Number(countResult.count) : 0
			const lastPage = Math.max(1, Math.ceil(total / perPage) || 1)
			const currentPage = Math.min(Math.max(1, page), lastPage)
			const offset = (currentPage - 1) * perPage
			const rows = await baseQuery.clone().select<Row[]>(columns as never).limit(perPage).offset(offset)
			const collection = new ModelCollection<InstanceType<T>>()

			for (const row of rows) {
				collection.push(new this(row) as InstanceType<T>)
			}

			return {
				data: collection,
				total,
				per_page: perPage,
				current_page: currentPage,
				next_page: currentPage < lastPage ? currentPage + 1 : null,
				prev_page: currentPage > 1 ? currentPage - 1 : null,
				last_page: lastPage,
			}
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Returns a row count for the current scope.
	 *
	 * When no scope is active, counts all rows in the table.
	 * The query scope is reset after execution.
	 *
	 * @param column - Column to count (default `'*'` for all rows).
	 * @returns Matching row count.
	 */
	static async count(this: typeof Model, column = '*'): Promise<number> {
		try {
			const table = this.resolveTable()
			const query = this.currentQuery ?? getDB()(table)
			const result = await query.count<{ count: string | number }>({ count: column }).first()
			if (!result) {
				return 0
			}

			return Number(result.count)
		} catch (error) {
			throw toError(error)
		} finally {
			this.currentQuery = undefined
		}
	}

	/**
	 * Serialises the model to a plain object for API responses.
	 *
	 * Excludes ORM internals (`fillable`, `hidden`, `modelName`, `table`) and
	 * any attributes listed in {@link Model.hidden | hidden}.
	 *
	 * @returns Plain data object safe to return from HTTP handlers.
	 */
	toArray(): Row {
		const data: Row = {}
		const excluded = new Set([
			'fillable',
			'hidden',
			'modelName',
			'table',
			...(Array.isArray(this.hidden) ? this.hidden : []),
		])

		for (const [key, value] of Object.entries(this)) {
			if (excluded.has(key) || typeof value === 'function') {
				continue
			}

			data[key] = value
		}

		return data
	}

	/**
	 * Removes internal and hidden fields from a model instance in place.
	 *
	 * @param model - Model object to strip.
	 * @param keepInternalState - When `true`, retains `fillable` and `hidden` keys.
	 * @returns The same object reference with keys removed.
	 */
	stripColumns<T extends Record<string, unknown>>(model: T, keepInternalState = false): T {
		const privateKeys = keepInternalState ? [] : this.#private
		const hiddenKeys = Array.isArray(this.hidden) ? this.hidden : []
		for (const key of [...privateKeys, ...hiddenKeys]) {
			delete model[key]
		}

		return model
	}
}

interface Model {
	/**
	 * Defines a one-to-one relationship to another model.
	 *
	 * @param Related - Related model class constructor.
	 * @param localKey - Parent key value (defaults to `this.id`).
	 * @param foreignKey - Foreign key column on the related table (defaults to `{modelName}_id`).
	 * @returns Lazy {@link HasOneRelation} — await directly or chain `where()` before executing.
	 *
	 * @example
	 * ```ts
	 * const profile = await user.profile()
	 * const active = await user.profile().where({ active: true }).first()
	 * ```
	 */
	hasOne<T extends typeof Model>(
		Related: T,
		localKey?: number | string,
		foreignKey?: string,
	): HasOneRelation<InstanceType<T>>

	/**
	 * Defines a one-to-many relationship to another model.
	 *
	 * @param Related - Related model class constructor.
	 * @param localKey - Parent key value (defaults to `this.id`).
	 * @param foreignKey - Foreign key column on the related table (defaults to `{modelName}_id`).
	 * @returns Lazy {@link HasManyRelation} — await for all rows or call `.get()` / `.first()`.
	 *
	 * @example
	 * ```ts
	 * const posts = await user.posts()
	 * const drafts = await user.posts().where({ status: 'draft' }).get()
	 * ```
	 */
	hasMany<T extends typeof Model>(
		Related: T,
		localKey?: number | string,
		foreignKey?: string,
	): HasManyRelation<InstanceType<T>>

	/**
	 * Defines an inverse belongs-to relationship to a parent model.
	 *
	 * @param Related - Parent model class constructor.
	 * @param foreignKey - Foreign key column on this model (defaults to `{relatedModelName}_id`).
	 * @param ownerKey - Primary key column on the parent table (defaults to `'id'`).
	 * @returns Lazy {@link BelongsToRelation} — await directly or chain `where()` before executing.
	 *
	 * @example
	 * ```ts
	 * const author = await post.author()
	 * ```
	 */
	belongsTo<T extends typeof Model>(
		Related: T,
		foreignKey?: string,
		ownerKey?: string,
	): BelongsToRelation<InstanceType<T>>
}

Object.assign(Model.prototype, createRelationshipMethods(getDB) as Pick<Model, 'hasOne' | 'hasMany' | 'belongsTo'>)

export { Model, ModelCollection }
export type { PaginatedResult }
export { HasOneRelation, HasManyRelation, BelongsToRelation, Relation } from './relation.js'
export {
	DB,
	getDB,
	configure,
	createKnexConfig,
	configureDatabase,
	setMigrationConfig,
	getMigrationConfig,
	makeMigration,
	migrateLatest,
	migrateRollback,
	migrateCurrentVersion,
	migrateList,
} from './config.js'