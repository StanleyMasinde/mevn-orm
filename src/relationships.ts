import type { Knex } from 'knex'
import {
	BelongsToRelation,
	HasManyRelation,
	HasOneRelation,
	type RelatedModelCtor,
	type RelationshipModel,
	type Row,
} from './relation.js'

interface RelationshipMethods {
	hasOne(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		localKey?: number | string,
		foreignKey?: string,
	): HasOneRelation
	hasMany(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		localKey?: number | string,
		foreignKey?: string,
	): HasManyRelation
	belongsTo(
		this: RelationshipModel,
		Related: RelatedModelCtor,
		foreignKey?: string,
		ownerKey?: string,
	): BelongsToRelation
}

/** Builds relationship methods that run against the active Knex instance. */
const createRelationshipMethods = (getDB: () => Knex): RelationshipMethods => ({
	hasOne(this: RelationshipModel, Related: RelatedModelCtor, localKey?: number | string, foreignKey?: string) {
		const table = new Related().table as string
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue === undefined) {
			return new HasOneRelation(Related, null)
		}

		const query = getDB()(table).where({ [relationKey]: keyValue }) as Knex.QueryBuilder<Row, Row[]>
		return new HasOneRelation(Related, query)
	},
	hasMany(this: RelationshipModel, Related: RelatedModelCtor, localKey?: number | string, foreignKey?: string) {
		const table = new Related().table as string
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue === undefined) {
			return new HasManyRelation(Related, null)
		}

		const query = getDB()(table).where({ [relationKey]: keyValue }) as Knex.QueryBuilder<Row, Row[]>
		return new HasManyRelation(Related, query)
	},
	belongsTo(this: RelationshipModel, Related: RelatedModelCtor, foreignKey?: string, ownerKey = 'id') {
		const table = new Related().table as string
		const relationKey = foreignKey ?? `${new Related().modelName}_id`
		const relationValue = this[relationKey]

		if (relationValue === undefined || relationValue === null) {
			return new BelongsToRelation(Related, null)
		}

		const query = getDB()(table).where({ [ownerKey]: relationValue }) as Knex.QueryBuilder<Row, Row[]>
		return new BelongsToRelation(Related, query)
	},
})

export { createRelationshipMethods }