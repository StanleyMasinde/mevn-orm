import type { AttributeColumn, Row } from './attributes.js'
import { getBackendFor, type Backend } from './backend.js'
import { bindModel, modelContext, type ExecutionContext } from './execution-context.js'
import { sqlIdentifier } from './join-sql.js'
import type { Model } from './model.js'

interface ManyToManyOptions<Parent extends Model, Related extends Model, K extends string> {
	/** Junction table name. */
	table: string
	/** Junction column pointing to the parent; defaults to {parentModelName}_id. */
	parentKey?: string
	/** Junction column pointing to the related model; defaults to {relatedModelName}_id. */
	relatedKey?: string
	/** Column on the parent model; defaults to id. */
	parentColumn?: AttributeColumn<Parent>
	/** Column on the related model; defaults to id. */
	relatedColumn?: AttributeColumn<Related>
	/** Junction columns copied to each entry's separate pivot object. */
	pivot: readonly K[]
	/** Fixed junction discriminator for a polymorphic association. */
	discriminator?: { column: string, value: string }
}

type PivotValues<K extends string> = { [Key in K]: unknown }
type ManyToManyEntry<Related extends Model, Pivot extends Row> = { related: Related, pivot: Pivot }

/** Read-only association query. Each junction row produces its own entry. */
class ManyToManyRelation<Related extends Model, K extends string, Pivot extends PivotValues<K> = PivotValues<K>> implements PromiseLike<ManyToManyEntry<Related, Pivot>[]> {
	private sort?: { column: string, direction: 'asc' | 'desc' }

	constructor(
		private readonly Related: new (properties?: Row) => Related,
		private readonly relatedTable: string,
		private readonly options: { table: string, parentKey: string, relatedKey: string, relatedColumn: string, pivot: readonly K[], discriminator?: { column: string, value: string } },
		private readonly parentValue: unknown,
		private readonly backend: Backend | null,
		private readonly context?: ExecutionContext,
	) {}

	/** Declare the value types of the selected pivot columns. This does not convert database values. */
	typedPivot<T extends PivotValues<K>>(): ManyToManyRelation<Related, K, Pick<T, K>> {
		return this as unknown as ManyToManyRelation<Related, K, Pick<T, K>>
	}

	/** Sort by a column on the related table. */
	orderBy(column: AttributeColumn<Related>, direction: 'asc' | 'desc' = 'asc'): this {
		sqlIdentifier(column)
		if (direction !== 'asc' && direction !== 'desc') throw new Error(`Invalid sort direction: ${direction}`)
		this.sort = { column, direction }
		return this
	}

	/** Load related models and their link-specific pivot values in one query. */
	async get(columns?: readonly AttributeColumn<Related>[]): Promise<ManyToManyEntry<Related, Pivot>[]> {
		this.context?.assertActive()
		if (this.parentValue === undefined || this.parentValue === null) return []
		if (!this.backend) throw new Error('Many-to-many relation has no backend')
		if (!this.backend.joinedRows) throw new Error('This backend does not support many-to-many reads (joined rows required)')
		if (columns && columns.length === 0) throw new Error('Select at least one related column')
		for (const column of columns ?? []) sqlIdentifier(column)
		const projection: Record<string, string> = {}
		const pivotAliases = this.options.pivot.map((column, index) => {
			const alias = `__mevn:pivot:${index}`
			projection[alias] = `junction.${column}`
			return alias
		})
		if (columns) for (const column of columns) projection[column] = `related.${column}`
		const relatedRows = await this.backend.joinedRows({
			table: this.options.table,
			alias: 'junction',
			joins: [{
				table: this.relatedTable, alias: 'related', kind: 'inner',
				on: [`related.${this.options.relatedColumn}`, '=', `junction.${this.options.relatedKey}`],
				onWhere: {},
			}],
			where: [
				{ column: `junction.${this.options.parentKey}`, operator: '=', value: this.parentValue },
				...(this.options.discriminator ? [{ column: `junction.${this.options.discriminator.column}`, operator: '=' as const, value: this.options.discriminator.value }] : []),
			],
			order: this.sort ? [{ column: `related.${this.sort.column}`, direction: this.sort.direction }] : [],
			...(columns ? {} : { selectAllFrom: 'related' }),
			projection,
		}, false) as Row[]
		const result: ManyToManyEntry<Related, Pivot>[] = []
		for (const row of relatedRows) {
			const attributes = { ...row }
			const pivot: Row = {}
			for (let index = 0; index < pivotAliases.length; index++) {
				const alias = pivotAliases[index]!
				pivot[this.options.pivot[index]!] = attributes[alias]
				delete attributes[alias]
			}
			const related = new this.Related(attributes)
			result.push({ related: bindModel(related.stripColumns(related), this.context), pivot: pivot as Pivot })
		}
		return result
	}

	/** Await the relation directly to load all related models and pivot values. */
	then<TResult1 = ManyToManyEntry<Related, Pivot>[], TResult2 = never>(
		onFulfilled?: ((value: ManyToManyEntry<Related, Pivot>[]) => TResult1 | PromiseLike<TResult1>) | null,
		onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.get().then(onFulfilled, onRejected)
	}
}

/** Internal constructor for a model-defined many-to-many relation. */
const manyToMany = <Parent extends Model, RelatedClass extends typeof Model, K extends string>(
	parent: Parent,
	Related: RelatedClass,
	options: ManyToManyOptions<Parent, InstanceType<RelatedClass>, K>,
): ManyToManyRelation<InstanceType<RelatedClass>, K> => {
	const relatedTable = Related.resolveTable()
	const parentKey = options.parentKey ?? `${parent.modelName}_id`
	const relatedKey = options.relatedKey ?? `${new Related().modelName}_id`
	for (const name of [options.table, parentKey, relatedKey, options.parentColumn ?? 'id', options.relatedColumn ?? 'id', relatedTable, ...options.pivot, ...(options.discriminator ? [options.discriminator.column] : [])]) sqlIdentifier(name)
	if (parentKey === relatedKey) throw new Error('Junction keys must differ; specify parentKey and relatedKey for a self-relation')
	if (new Set(options.pivot).size !== options.pivot.length) throw new Error('Pivot columns must be unique')
	if (options.discriminator && [parentKey, relatedKey].includes(options.discriminator.column)) {
		throw new Error('Discriminator column must differ from junction keys')
	}
	const parentValue = parent[options.parentColumn ?? 'id']
	const context = modelContext(parent)
	context?.assertActive()
	const backend = parentValue === null || parentValue === undefined ? null : getBackendFor(parent)
	return new ManyToManyRelation<InstanceType<RelatedClass>, K>(Related as unknown as new (properties?: Row) => InstanceType<RelatedClass>, relatedTable, {
		table: options.table, parentKey, relatedKey,
		relatedColumn: options.relatedColumn ?? 'id', pivot: [...options.pivot],
		...(options.discriminator ? { discriminator: { ...options.discriminator } } : {}),
	}, parentValue, backend, context)
}

export { manyToMany, ManyToManyRelation }
export type { ManyToManyEntry, ManyToManyOptions }
