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
	hasOne<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		localKey?: number | string,
		foreignKey?: string,
	): HasOneRelation<T>
	hasMany<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		localKey?: number | string,
		foreignKey?: string,
	): HasManyRelation<T>
	belongsTo<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		foreignKey?: string,
		ownerKey?: string,
	): BelongsToRelation<T>
}

/** Builds relationship methods that run against the active Knex instance. */
const createRelationshipMethods = (getDB: () => Knex): RelationshipMethods => ({
	hasOne<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		localKey?: number | string,
		foreignKey?: string,
	) {
		const table = new Related().table as string
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue === undefined) {
			return new HasOneRelation<T>(Related, null)
		}

		const query = getDB()(table).where({ [relationKey]: keyValue }) as Knex.QueryBuilder<Row, Row[]>
		return new HasOneRelation<T>(Related, query)
	},
	hasMany<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		localKey?: number | string,
		foreignKey?: string,
	) {
		const table = new Related().table as string
		const keyValue = localKey ?? this.id
		const relationKey = foreignKey ?? `${this.modelName}_id`

		if (keyValue === undefined) {
			return new HasManyRelation<T>(Related, null)
		}

		const query = getDB()(table).where({ [relationKey]: keyValue }) as Knex.QueryBuilder<Row, Row[]>
		return new HasManyRelation<T>(Related, query)
	},
	belongsTo<T extends RelationshipModel>(
		this: RelationshipModel,
		Related: RelatedModelCtor<T>,
		foreignKey?: string,
		ownerKey = 'id',
	) {
		const table = new Related().table as string
		const relationKey = foreignKey ?? `${new Related().modelName}_id`
		const relationValue = this[relationKey]

		if (relationValue === undefined || relationValue === null) {
			return new BelongsToRelation<T>(Related, null)
		}

		const query = getDB()(table).where({ [ownerKey]: relationValue }) as Knex.QueryBuilder<Row, Row[]>
		return new BelongsToRelation<T>(Related, query)
	},
})

export { createRelationshipMethods }