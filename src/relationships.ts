import type { Knex } from 'knex'

type Row = Record<string, unknown>

interface RelationshipModel {
	[key: string]: unknown
	table: string
	modelName: string
	id?: number | string
	stripColumns<T extends RelationshipModel>(model: T, keepInternalState?: boolean): T
}

type RelatedModelCtor = new (properties?: Row) => RelationshipModel

interface RelationshipMethods {
	hasOne(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		localKey?: number | string,
		foreignKey?: string,
	): Promise<RelationshipModel | null>
	hasMany(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		localKey?: number | string,
		foreignKey?: string,
	): Promise<RelationshipModel[]>
	belongsTo(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		foreignKey?: string,
		ownerKey?: string,
	): Promise<RelationshipModel | null>
}

/** Builds relationship methods that run against the active Knex instance. */
const createRelationshipMethods = (getDB: () => Knex): RelationshipMethods => ({
	async hasOne(this: RelationshipModel, Related: RelatedModelCtor, localKey?: number | string, foreignKey?: string) {
		const table = new Related().table
		const relation: Row = {}
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue !== undefined) {
			relation[relationKey] = keyValue
			const result = await getDB()(table).where(relation).first<Row>()
			if (result) {
				const related = new Related(result)
				return related.stripColumns(related)
			}
		}

		return null
	},
	async hasMany(this: RelationshipModel, Related: RelatedModelCtor, localKey?: number | string, foreignKey?: string) {
		const table = new Related().table
		const relation: Row = {}
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue === undefined) {
			return []
		}

		relation[relationKey] = keyValue
		const rows = await getDB()(table).where(relation).select<Row[]>('*')
		return rows.map((row) => {
			const related = new Related(row)
			return related.stripColumns(related)
		})
	},
	async belongsTo(this: RelationshipModel, Related: RelatedModelCtor, foreignKey?: string, ownerKey = 'id') {
		const table = new Related().table
		const relation: Row = {}
		const relationKey = foreignKey ?? `${new Related().modelName}_id`
		const relationValue = this[relationKey]

		if (relationValue === undefined || relationValue === null) {
			return null
		}

		relation[ownerKey] = relationValue
		const row = await getDB()(table).where(relation).first<Row>()
		if (!row) {
			return null
		}

		const related = new Related(row)
		return related.stripColumns(related)
	},
})

export { createRelationshipMethods }
