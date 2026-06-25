import { describe, expectTypeOf, it } from 'vitest'
import {
	Model,
	HasOneRelation,
	HasManyRelation,
	BelongsToRelation,
} from '../../index.js'

class Profile extends Model {
	override fillable = ['farmer_id', 'bio']
}

class Farmer extends Model {
	override fillable = ['name', 'email', 'password']

	profile() {
		return this.hasOne(Profile)
	}

	farms() {
		return this.hasMany(Farm)
	}
}

class Farm extends Model {
	override fillable = ['farmer_id', 'name']

	farmer() {
		return this.belongsTo(Farmer, 'farmer_id')
	}
}

declare const farmer: Farmer
declare const farm: Farm

async function assertRelationTypes() {
	const hasOne = farmer.profile()
	expectTypeOf(hasOne).toEqualTypeOf<HasOneRelation<Profile>>()
	expectTypeOf(hasOne.where).toBeFunction()
	expectTypeOf(hasOne.first).toBeFunction()

	const chainedHasOne = farmer.profile().where({ farmer_id: farmer.id })
	expectTypeOf(chainedHasOne).toEqualTypeOf<HasOneRelation<Profile>>()

	const profile = await farmer.profile()
	expectTypeOf(profile).toEqualTypeOf<Profile | null>()

	const profileFirst = await farmer.profile().where({ farmer_id: farmer.id }).first()
	expectTypeOf(profileFirst).toEqualTypeOf<Profile | null>()

	const hasMany = farmer.farms()
	expectTypeOf(hasMany).toEqualTypeOf<HasManyRelation<Farm>>()
	expectTypeOf(hasMany.where).toBeFunction()
	expectTypeOf(hasMany.get).toBeFunction()

	const chainedHasMany = farmer.farms().where({ name: 'Farm One' })
	expectTypeOf(chainedHasMany).toEqualTypeOf<HasManyRelation<Farm>>()

	const farms = await farmer.farms()
	expectTypeOf(farms).toEqualTypeOf<Farm[]>()

	const farmsGet = await farmer.farms().where({ name: 'Farm One' }).get()
	expectTypeOf(farmsGet).toEqualTypeOf<Farm[]>()

	const belongsTo = farm.farmer()
	expectTypeOf(belongsTo).toEqualTypeOf<BelongsToRelation<Farmer>>()
	expectTypeOf(belongsTo.where).toBeFunction()
	expectTypeOf(belongsTo.first).toBeFunction()

	const parent = await farm.farmer()
	expectTypeOf(parent).toEqualTypeOf<Farmer | null>()

	const parentFirst = await farm.farmer().where({ id: farmer.id }).first()
	expectTypeOf(parentFirst).toEqualTypeOf<Farmer | null>()
}

describe('Relationship method return types', () => {
	it('returns lazy relation instances and preserves derived model types', () => {
		expectTypeOf(assertRelationTypes).returns.resolves.toBeVoid()
	})
})
