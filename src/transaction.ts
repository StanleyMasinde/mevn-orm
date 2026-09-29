import { getBackend, type Backend } from './backend.js'
import { ExecutionContext, bindModel, withContext } from './execution-context.js'
import {
	Model,
	type ModelCollection,
	type ModelQuery,
	type PaginatedResult,
} from './model.js'
import type { AttributeColumn, CreateAttributes, Row, UpdateAttributes, WhereAttributes } from './attributes.js'

/** Model operations explicitly bound to one live transaction. */
class TransactionModel<T extends typeof Model> {
	constructor(private readonly context: ExecutionContext, private readonly ModelClass: T) {}

	private run<R>(callback: () => R): R {
		return withContext(this.context, callback)
	}

	/** Makes a new bound instance for insert-only `save()` or later instance writes. */
	make(properties: Row = {}): InstanceType<T> {
		return bindModel(new this.ModelClass(properties) as InstanceType<T>, this.context)
	}

	query(): ModelQuery<InstanceType<T>> {
		return this.run(() => this.ModelClass.ensureCurrentQuery()) as ModelQuery<InstanceType<T>>
	}

	where(conditions: WhereAttributes<InstanceType<T>> = {}): ModelQuery<InstanceType<T>> {
		return this.run(() => this.ModelClass.where(conditions)) as ModelQuery<InstanceType<T>>
	}

	orderBy(column: AttributeColumn<InstanceType<T>>, direction: 'asc' | 'desc' = 'asc'): ModelQuery<InstanceType<T>> {
		return this.query().orderBy(column, direction)
	}

	limit(count: number): ModelQuery<InstanceType<T>> {
		return this.query().limit(count)
	}

	offset(count: number): ModelQuery<InstanceType<T>> {
		return this.query().offset(count)
	}

	async find(id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		const model = await this.run(() => this.ModelClass.find(id, columns))
		return model ? bindModel(model, this.context) as InstanceType<T> : null
	}

	async findOrFail(id: number | string, columns: string | string[] = '*'): Promise<InstanceType<T>> {
		return bindModel(await this.run(() => this.ModelClass.findOrFail(id, columns)), this.context) as InstanceType<T>
	}

	async create(properties: CreateAttributes<InstanceType<T>>): Promise<InstanceType<T>> {
		return bindModel(await this.run(() => this.ModelClass.create(properties)), this.context) as InstanceType<T>
	}

	async createMany(properties: CreateAttributes<InstanceType<T>>[]): Promise<InstanceType<T>[]> {
		const models = await this.run(() => this.ModelClass.createMany(properties))
		return models.map((model) => bindModel(model, this.context)) as InstanceType<T>[]
	}

	async firstOrCreate(
		attributes: WhereAttributes<InstanceType<T>>,
		values: UpdateAttributes<InstanceType<T>> = {},
	): Promise<InstanceType<T>> {
		return bindModel(await this.run(() => this.ModelClass.firstOrCreate(attributes, values)), this.context) as InstanceType<T>
	}

	async first(columns: string | string[] = '*'): Promise<InstanceType<T> | null> {
		const model = await this.run(() => this.ModelClass.first(columns))
		return model ? bindModel(model, this.context) as InstanceType<T> : null
	}

	async all(columns: string | string[] = '*'): Promise<ModelCollection<InstanceType<T>>> {
		const models = await this.run(() => this.ModelClass.all(columns))
		for (const model of models) bindModel(model, this.context)
		return models as ModelCollection<InstanceType<T>>
	}

	async paginate(perPage = 15, page = 1, columns: string | string[] = '*'): Promise<PaginatedResult<InstanceType<T>>> {
		const result = await this.run(() => this.ModelClass.paginate(perPage, page, columns))
		for (const model of result.data) bindModel(model, this.context)
		return result as PaginatedResult<InstanceType<T>>
	}

	count(column = '*'): Promise<number> {
		return this.run(() => this.ModelClass.count(column))
	}

	update(properties: UpdateAttributes<InstanceType<T>>): Promise<number> {
		return this.run(() => this.ModelClass.update(properties))
	}

	destroy(): Promise<number> {
		return this.run(() => this.ModelClass.destroy())
	}
}

/** A transaction scope. Returned models remain bound until this scope completes. */
class TransactionContext {
	constructor(private readonly context: ExecutionContext) {}

	model<T extends typeof Model>(ModelClass: T): TransactionModel<T> {
		this.context.assertActive()
		return new TransactionModel(this.context, ModelClass)
	}

	/** Binds an existing instance; useful before `save()`, `update()`, or relation calls. */
	bind<T extends Model>(model: T): T {
		return bindModel(model, this.context)
	}

	/** Nested Knex transactions use a savepoint; unsupported backends fail before work. */
	transaction<T>(callback: (transaction: TransactionContext) => Promise<T>): Promise<T> {
		this.context.assertActive()
		return runTransaction(this.context.backend, callback)
	}
}

const runTransaction = async <T>(backend: Backend, callback: (transaction: TransactionContext) => Promise<T>): Promise<T> => {
	if (!backend.transaction) throw new Error('This backend does not support transactions')
	return backend.transaction(async (scopedBackend) => {
		const context = new ExecutionContext(scopedBackend)
		try {
			return await callback(new TransactionContext(context))
		} finally {
			context.dispose()
		}
	})
}

/** Runs model work in an explicit backend transaction without changing global configuration. */
const transaction = <T>(callback: (transaction: TransactionContext) => Promise<T>): Promise<T> => runTransaction(getBackend(), callback)

export { transaction, TransactionContext, TransactionModel }
