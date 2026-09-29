import { describe, expectTypeOf, it } from 'vitest'
import { Model } from '../../index.js'

class Farmer extends Model {
	declare code: string
	farms() {
		return this.belongsToMany(Farm, {
			table: 'farmer_farms', parentKey: 'farmer_code', relatedKey: 'farm_code',
			parentColumn: 'code', relatedColumn: 'code', pivot: ['rate', 'position'] as const,
		}).typedPivot<{ rate: number, position: number }>().orderBy('name')
	}
}
class Farm extends Model {
	declare code: string
	declare name: string
}
class LooseFarm extends Model {}
class LooseFarmer extends Model {
	farms() {
		return this.belongsToMany(LooseFarm, { table: 'farmer_farms', pivot: ['note'] as const })
	}
}
class Post extends Model { declare title: string }
class Comment extends Model {
	declare body: string
	post() {
		return this.belongsToMany(Post, {
			table: 'comment_posts',
			discriminator: { column: 'comment_type', value: 'comment' }, pivot: ['position'] as const,
		}).typedPivot<{ position: number }>()
	}
}

class InvalidFarmer extends Model {
	farms() {
		// @ts-expect-error unknown related column
		return this.belongsToMany(Farm, { table: 'farmer_farms', relatedColumn: 'missing', pivot: [] })
	}
}

function invalidTypes() {
	// @ts-expect-error typed pivot must include every selected pivot column
	new Farmer().farms().typedPivot<{ rate: number }>()
	// @ts-expect-error typed related model has no missing column
	new Farmer().farms().orderBy('missing')
}

describe('many-to-many types', () => {
	it('keeps related models and pivot values separate', () => {
		expectTypeOf<ReturnType<ReturnType<Farmer['farms']>['get']>>().toEqualTypeOf<Promise<{ related: Farm, pivot: { rate: number, position: number } }[]>>()
		expectTypeOf<ReturnType<ReturnType<LooseFarmer['farms']>['get']>>().toEqualTypeOf<Promise<{ related: LooseFarm, pivot: { note: unknown } }[]>>()
		expectTypeOf<Awaited<ReturnType<Comment['post']>>>().toEqualTypeOf<{ related: Post, pivot: { position: number } }[]>()
		expectTypeOf(invalidTypes).toBeFunction()
	})
})
