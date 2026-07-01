import { describe, expectTypeOf, it } from 'vitest'
import { Model, ModelCollection, type PaginatedResult } from '../../index.js'

class User extends Model {
	override fillable = ['name', 'email', 'password']
	override hidden = ['password']

	isAdmin(): boolean {
		return this.role === 'admin'
	}
}

declare const userId: number

async function assertDerivedTypes() {
	const user = await User.findOrFail(userId)
	expectTypeOf(user).toEqualTypeOf<User>()
	user.isAdmin()

	const found = await User.find(userId)
	if (found) {
		expectTypeOf(found).toEqualTypeOf<User>()
		found.isAdmin()
	}

	const created = await User.create({ name: 'Test' })
	expectTypeOf(created).toEqualTypeOf<User>()

	const users = await User.all()
	expectTypeOf(users).toEqualTypeOf<ModelCollection<User>>()
	expectTypeOf(users.toArray()).toEqualTypeOf<Record<string, unknown>[]>()

	const serialized = (await User.findOrFail(userId)).toArray()
	expectTypeOf(serialized).toEqualTypeOf<Record<string, unknown>>()

	const scoped = await User.where({ id: userId }).first()
	if (scoped) {
		expectTypeOf(scoped).toEqualTypeOf<User>()
	}

	const ordered = User.orderBy('name', 'desc')
	expectTypeOf(ordered).toEqualTypeOf<typeof User>()

	const chained = await User.where({ id: userId }).orderBy('name', 'desc').limit(10).all()
	expectTypeOf(chained).toEqualTypeOf<ModelCollection<User>>()

	const paginated = await User.paginate(10, 1)
	expectTypeOf(paginated).toEqualTypeOf<PaginatedResult<User>>()
	expectTypeOf(paginated.data).toEqualTypeOf<ModelCollection<User>>()
}

describe('Model static method return types', () => {
	it('preserves derived class types at call sites', () => {
		expectTypeOf(assertDerivedTypes).returns.resolves.toBeVoid()
	})
})