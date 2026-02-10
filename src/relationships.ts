import type { Knex } from 'knex'

type Row = Record<string, unknown>

interface RelationshipModel {
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
}

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
})

export { createRelationshipMethods }
