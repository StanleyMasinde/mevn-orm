import { describe, expectTypeOf, it } from 'vitest'
import { Model, ModelCollection, ModelQuery, type PaginatedResult } from '../../index.js'

class User extends Model {
	override fillable = ['name', 'email', 'password']
	override hidden = ['password']

	isAdmin(): boolean {
		return this.role === 'admin'
	}
}

class TypedItem extends Model {
	declare name: string
	declare score: number | null
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

	const json = (await User.findOrFail(userId)).toJson()
	expectTypeOf(json).toEqualTypeOf<Record<string, unknown>>()
	expectTypeOf(json).not.toEqualTypeOf<Record<string, unknown>[]>()

	const scoped = await User.where({ id: userId }).first()
	if (scoped) {
		expectTypeOf(scoped).toEqualTypeOf<User>()
	}

	const ordered = User.orderBy('name', 'desc')
	expectTypeOf(ordered).toEqualTypeOf<ModelQuery<User>>()

	const chained = await User.where({ id: userId }).orderBy('name', 'desc').limit(10).all()
	expectTypeOf(chained).toEqualTypeOf<ModelCollection<User>>()

	const paginated = await User.paginate(10, 1)
	expectTypeOf(paginated).toEqualTypeOf<PaginatedResult<User>>()
	expectTypeOf(paginated.data).toEqualTypeOf<ModelCollection<User>>()

	const typed = TypedItem.where({ name: 'desk' }).clone()
	expectTypeOf(typed).toEqualTypeOf<ModelQuery<TypedItem>>()
	expectTypeOf(await typed.firstOrFail()).toEqualTypeOf<TypedItem>()
	expectTypeOf(await typed.exists()).toEqualTypeOf<boolean>()
	expectTypeOf(await typed.value('name')).toEqualTypeOf<string | undefined>()
	expectTypeOf(await typed.value('score')).toEqualTypeOf<number | null | undefined>()
	expectTypeOf(await typed.pluck('score')).toEqualTypeOf<(number | null)[]>()
	// @ts-expect-error only declared columns can be selected
	await typed.pluck('unknown_column')
	expectTypeOf(await User.where({ id: userId }).value('anything')).toEqualTypeOf<unknown>()
}

describe('Model static method return types', () => {
	it('preserves derived class types at call sites', () => {
		expectTypeOf(assertDerivedTypes).returns.resolves.toBeVoid()
	})
})
