import type { AttributeColumn, AttributeValue, CreateAttributes, Row, UpdateAttributes, WhereAttributes } from './attributes.js'
import { getBackend, getBackendFor, type TableQuery } from './backend.js'
import { bindModel, currentContext, modelContext, type ExecutionContext } from './execution-context.js'
import { getTableName, toSnakeCase } from './inflect.js'
import { FilterBuilder, type FilterNode } from './filters.js'
import { BelongsToRelation, HasManyRelation, HasOneRelation } from './relation.js'
import { createRelationshipMethods } from './relationships.js'

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
 * ActiveRecord-style base model backed by the configured database.
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
	 * @deprecated Query chains now have independent state. This property remains
	 * temporarily for source compatibility and is always undefined.
	 */
	static currentQuery: undefined

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
	 * Starts an independent query against the model table.
	 */
	static ensureCurrentQuery<T extends typeof Model>(this: T): ModelQuery<InstanceType<T>> {
		return new ModelQuery(this as unknown as new (properties?: Row) => InstanceType<T>, getBackend().query(this.resolveTable()))
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
		modelContext(this)?.assertActive()
		try {
			const rows: Row = {}
			for (const field of this.fillable) {
				rows[field] = this[field]
			}

			const id = await getBackendFor(this).query(this.table).insert(rows)
			const fields = await getBackendFor(this).query(this.table).where({ id }).first()

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
	async update(properties: UpdateAttributes<this>): Promise<this> {
		modelContext(this)?.assertActive()
		if (this.id === undefined) {
			throw new Error('Cannot update model without id')
		}

		try {
			await getBackendFor(this).query(this.table).where({ id: this.id }).update(properties)
			const fields = await getBackendFor(this).query(this.table).where({ id: this.id }).first()

			if (!fields) {
				throw new Error(`Failed to load updated record for table "${this.table}"`)
			}

			const next = new (this.constructor as new (props: Row) => this)(fields)
			return bindModel(this.stripColumns(next), modelContext(this))
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
		modelContext(this)?.assertActive()
		if (this.id === undefined) {
			throw new Error('Cannot delete model without id')
		}

		try {
			await getBackendFor(this).query(this.table).where({ id: this.id }).delete()
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Bulk-updates rows in the model table.
	 *
	 * Updates all rows. Call `Model.where(...).update(...)` for a scoped update.
	 *
	 * @param properties - Columns and values to update.
	 * @returns Number of rows updated.
	 */
	static async update<T extends typeof Model>(this: T, properties: UpdateAttributes<InstanceType<T>>): Promise<number> {
		try {
			return await getBackend().query(this.resolveTable()).update(properties)
		} catch (error) {
			throw toError(error)
		}
	}

	/**
	 * Bulk-deletes rows in the model table.
	 *
	 * Deletes all rows. Call `Model.where(...).destroy()` for a scoped delete.
	 *
	 * @returns Number of rows deleted.
	 */
	static async destroy(): Promise<number> {
		try {
			return await getBackend().query(this.resolveTable()).delete()
		} catch (error) {
			throw toError(error)
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
			const fields = await getBackend().query(table).where({ id }).first(columns)
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
	static async create<T extends typeof Model>(this: T, properties: CreateAttributes<InstanceType<T>>): Promise<InstanceType<T>> {
		const table = this.resolveTable()

		try {
			const id = await getBackend().query(table).insert(properties)
			const record = await getBackend().query(table).where({ id }).first()

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
	static async createMany<T extends typeof Model>(this: T, properties: CreateAttributes<InstanceType<T>>[]): Promise<InstanceType<T>[]> {
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
	static async firstOrCreate<T extends typeof Model>(
		this: T,
		attributes: WhereAttributes<InstanceType<T>>,
		values: UpdateAttributes<InstanceType<T>> = {},
	): Promise<InstanceType<T>> {
		const table = this.resolveTable()
		try {
			const record = await getBackend().query(table).where(attributes).first()
			if (record) {
				const model = new this(record) as InstanceType<T>
				return model.stripColumns(model)
			}

			return this.create({ ...attributes, ...values } as CreateAttributes<InstanceType<T>>)
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
	 * @param conditions - Equality conditions for the query.
	 * @returns Independent query for chaining.
	 */
	static where<T extends typeof Model>(this: T, conditions: WhereAttributes<InstanceType<T>> = {}): ModelQuery<InstanceType<T>> {
		return new ModelQuery(this as unknown as new (properties?: Row) => InstanceType<T>, getBackend().query(this.resolveTable()).where(conditions))
	}

	/**
	 * Appends an `orderBy` clause to the current scoped query.
	 *
	 * @param column - Column to sort by.
	 * @param direction - Sort direction (`'asc'` or `'desc'`). Defaults to `'asc'`.
	 * @returns Independent query for chaining.
	 */
	static orderBy<T extends typeof Model>(this: T, column: AttributeColumn<InstanceType<T>>, direction: 'asc' | 'desc' = 'asc'): ModelQuery<InstanceType<T>> {
		return this.ensureCurrentQuery().orderBy(column, direction)
	}

	/**
	 * Appends a `limit` clause to the current scoped query.
	 *
	 * @param count - Maximum number of rows to return.
	 * @returns Independent query for chaining.
	 */
	static limit<T extends typeof Model>(this: T, count: number): ModelQuery<InstanceType<T>> {
		return this.ensureCurrentQuery().limit(count)
	}

	/**
	 * Appends an `offset` clause to the current scoped query.
	 *
	 * @param count - Number of rows to skip (commonly paired with {@link Model.limit | limit()}).
	 * @returns Independent query for chaining.
	 */
	static offset<T extends typeof Model>(this: T, count: number): ModelQuery<InstanceType<T>> {
		return this.ensureCurrentQuery().offset(count)
	}

	/**
	 * Returns the first model matching the current scope.
	 *
	 * When no scope is active, returns the first row in the table.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns First matching model, or `null` when none found.
	 */
	static async first<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		return this.ensureCurrentQuery().first(columns)
	}

	/**
	 * Returns all models matching the current scope.
	 *
	 * When no scope is active, returns every row in the table.
	 *
	 * @param columns - Columns to select (default `'*'`).
	 * @returns {@link ModelCollection} of matching models.
	 */
	static async all<T extends typeof Model>(this: T, columns: string | string[] = '*'): Promise<ModelCollection<InstanceType<T>>> {
		return this.ensureCurrentQuery().all(columns)
	}

	/**
	 * Returns a paginated result set for the current scope.
	 *
	 * Runs a count query and a data query against the scoped builder.
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
		return this.ensureCurrentQuery().paginate(perPage, page, columns)
	}

	/**
	 * Returns a row count for the current scope.
	 *
	 * When no scope is active, counts all rows in the table.
	 *
	 * @param column - Column to count (default `'*'` for all rows).
	 * @returns Matching row count.
	 */
	static async count(this: typeof Model, column = '*'): Promise<number> {
		return this.ensureCurrentQuery().count(column)
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
	 * Serialises this model to a single plain object (not an array).
	 *
	 * Same payload as {@link Model.toArray | toArray()} — internals and `hidden`
	 * attributes omitted. Use this when you want one record; use
	 * {@link ModelCollection.toArray | ModelCollection.toArray()} for a list.
	 *
	 * Call explicitly: this is not the automatic `toJSON()` hook used by
	 * `JSON.stringify`. Use `JSON.stringify(model.toJson())` for a JSON string.
	 *
	 * @returns Plain data object for this row.
	 */
	toJson(): Row {
		return this.toArray()
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

/** An independent model query; safe to keep or run alongside other queries. */
class ModelQuery<T extends Model> extends FilterBuilder<T> {
	private limitCount: number | undefined

	constructor(
		private readonly ModelClass: new (properties?: Row) => T,
		private readonly query: TableQuery,
		private readonly context: ExecutionContext | undefined = currentContext(),
	) {
		super()
	}

	/** Forks this query, including its current filters, ordering, limit, and offset. */
	clone(): ModelQuery<T> {
		const copy = new ModelQuery(this.ModelClass, this.query.clone(), this.context)
		copy.limitCount = this.limitCount
		return copy
	}

	protected addFilter(node: FilterNode): void {
		if (node.kind === 'object') {
			this.query.where(node.conditions)
			return
		}
		if (!this.query.filter) throw new Error('This backend does not support extended filters')
		this.query.filter(node)
	}
	/** Locks selected rows for update when the backend and transaction support it. */
	forUpdate(): this {
		if (!this.context) throw new Error('Row locking requires a transaction')
		this.context.assertActive()
		if (!this.query.lock) throw new Error('This backend does not support row locking')
		this.query.lock('update')
		return this
	}
	/** Locks selected rows for shared reads when supported. */
	forShare(): this {
		if (!this.context) throw new Error('Row locking requires a transaction')
		this.context.assertActive()
		if (!this.query.lock) throw new Error('This backend does not support row locking')
		this.query.lock('share')
		return this
	}
	orderBy(column: AttributeColumn<T>, direction: 'asc' | 'desc' = 'asc'): this {
		this.query.orderBy(column, direction)
		return this
	}
	limit(count: number): this {
		this.query.limit(count)
		this.limitCount = count
		return this
	}
	offset(count: number): this {
		this.query.offset(count)
		return this
	}
	async first(columns: string | string[] = '*'): Promise<T | null> {
		const row = await this.query.first(columns)
		return row ? bindModel(new this.ModelClass(row), this.context) : null
	}
	/** Returns the first matching model, or throws if no row matches. */
	async firstOrFail(columns: string | string[] = '*'): Promise<T> {
		const row = await this.query.clone().first(columns)
		if (!row) throw new Error(`${this.ModelClass.name} not found`)
		return bindModel(new this.ModelClass(row), this.context)
	}
	/** Checks whether the current page contains at least one row. */
	async exists(): Promise<boolean> {
		this.context?.assertActive()
		if (this.limitCount === 0) return false
		return await this.query.clone().limit(1).first() !== null
	}
	/** Selects one scalar without constructing a model; missing rows return `undefined`. */
	async value<K extends AttributeColumn<T>>(column: K): Promise<AttributeValue<T, K> | undefined> {
		this.context?.assertActive()
		if (this.limitCount === 0) return undefined
		const row = await this.query.clone().limit(1).first(column)
		return row?.[column] as AttributeValue<T, K> | undefined
	}
	/** Selects one column from every matching row without constructing models. */
	async pluck<K extends AttributeColumn<T>>(column: K): Promise<AttributeValue<T, K>[]> {
		const rows = await this.query.clone().select(column)
		return rows.map((row) => row[column] as AttributeValue<T, K>)
	}
	async all(columns: string | string[] = '*'): Promise<ModelCollection<T>> {
		const rows = await this.query.select(columns)
		const collection = new ModelCollection<T>()
		for (const row of rows) collection.push(bindModel(new this.ModelClass(row), this.context))
		return collection
	}
	async count(column = '*'): Promise<number> {
		return this.query.count(column)
	}
	async update(properties: UpdateAttributes<T>): Promise<number> {
		return this.query.update(properties)
	}
	async destroy(): Promise<number> {
		return this.query.delete()
	}
	async paginate(perPage = DEFAULT_PER_PAGE, page = 1, columns: string | string[] = '*'): Promise<PaginatedResult<T>> {
		if (!Number.isSafeInteger(perPage) || perPage <= 0) throw new RangeError('perPage must be a positive integer')
		if (!Number.isSafeInteger(page) || page <= 0) throw new RangeError('page must be a positive integer')
		const total = await this.query.clone().count()
		const lastPage = Math.max(1, Math.ceil(total / perPage))
		const currentPage = Math.min(page, lastPage)
		const rows = await this.query.clone().limit(perPage).offset((currentPage - 1) * perPage).select(columns)
		const data = new ModelCollection<T>()
		for (const row of rows) data.push(bindModel(new this.ModelClass(row), this.context))
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

Object.assign(Model.prototype, createRelationshipMethods(getBackendFor) as Pick<Model, 'hasOne' | 'hasMany' | 'belongsTo'>)

export { Model, ModelCollection, ModelQuery }
export type { PaginatedResult }
export type { ModelAttributes, CreateAttributes, WhereAttributes, UpdateAttributes, AttributeColumn } from './attributes.js'
export { HasOneRelation, HasManyRelation, BelongsToRelation, Relation } from './relation.js'
export type { RelationPaginatedResult } from './relation.js'
export type { ComparisonOperator } from './filters.js'
