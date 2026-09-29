import { describe, expectTypeOf, it } from 'vitest'
import {
	Model,
	type CreateAttributes,
	type ModelAttributes,
	type UpdateAttributes,
	type WhereAttributes,
	type AttributeColumn,
} from '../../index.js'

class LooseUser extends Model {
	override fillable = ['name', 'email']
}

class TypedUser extends Model {
	declare name: string
	declare email: string
	declare password: string
	declare role?: string

	override fillable = ['name', 'email', 'password']
	override hidden = ['password']

	isAdmin(): boolean {
		return this.role === 'admin'
	}
}

interface MergedUser {
	name: string
	email: string
}

class MergedUser extends Model {
	override fillable = ['name', 'email']
}

class TypedFilterItem extends Model {
	declare owner_id: number
	declare price: number
	declare title: string
	declare expires_at: string | null
}

class TypedFilterOwner extends Model {
	items() {
		return this.hasMany(TypedFilterItem)
	}
}

declare const typedUser: TypedUser

async function assertLooseWritesRemainOpen() {
	await LooseUser.create({ anything: true, name: 1 })
	LooseUser.where({ nme: 'typo-ok-when-untyped' })
	await LooseUser.update({ archived: true })
	LooseUser.orderBy('created_at')
}

async function assertTypedWrites() {
	await TypedUser.create({
		name: 'Jane',
		email: 'jane@example.com',
		password: 'hash',
	})

	await TypedUser.create({
		name: 'Jane',
		email: 'jane@example.com',
		password: 'hash',
		role: 'admin',
	})

	// @ts-expect-error missing required create fields
	await TypedUser.create({ name: 'Jane' })

	await TypedUser.create({
		name: 'Jane',
		email: 'jane@example.com',
		password: 'hash',
		// @ts-expect-error unknown create attribute
		nme: 'typo',
	})

	await TypedUser.createMany([
		{ name: 'Ada', email: 'ada@example.com', password: 'h1' },
	])

	TypedUser.where({ email: 'jane@example.com', id: 1 })
	// @ts-expect-error unknown where attribute
	TypedUser.where({ nme: 'Jane' })

	await TypedUser.update({ name: 'Jane Updated' })
	// @ts-expect-error unknown update attribute
	await TypedUser.update({ nme: 'Jane' })

	await typedUser.update({ email: 'next@example.com' })
	// @ts-expect-error unknown instance update attribute
	await typedUser.update({ nme: 'Jane' })

	await TypedUser.firstOrCreate({ email: 'jane@example.com' }, { name: 'Jane' })

	TypedUser.orderBy('email')
	TypedUser.orderBy('id')
	// @ts-expect-error unknown orderBy column
	TypedUser.orderBy('nme')

	await MergedUser.create({ name: 'Ada', email: 'ada@example.com' })
	// @ts-expect-error missing required merged create field
	await MergedUser.create({ name: 'Ada' })
}

async function assertTypedFilters() {
	const query = TypedFilterItem.where({ owner_id: 1 })
		.where('price', '>=', 100)
		.whereIn('title', ['Desk', 'Chair'])
		.whereNotIn('price', [0])
		.whereBetween('price', [100, 200])
		.whereNull('expires_at')
		.whereNotNull('title')
		.whereLike('title', '%desk%')
		.whereILike('title', '%DESK%')
		.where((group) => group.where('price', '>', 100).orWhereLike('title', '%desk%'))
	await query.all()
	TypedFilterItem.where({}).where('expires_at', '>', new Date())
	// @ts-expect-error unknown column
	TypedFilterItem.where({}).whereIn('unknown_column', [1])
	// @ts-expect-error price is numeric
	TypedFilterItem.where({}).where('price', '>=', '100')
	// @ts-expect-error LIKE requires a text field on typed models
	TypedFilterItem.where({}).whereLike('price', '%100%')
	// @ts-expect-error price membership is numeric
	TypedFilterItem.where({}).whereIn('price', ['100'])
	// @ts-expect-error unsupported operator
	TypedFilterItem.where({}).where('price', 'contains', 100)
	// @ts-expect-error invalid range endpoint
	TypedFilterItem.where({}).whereBetween('price', [0, '100'])

	const owner = new TypedFilterOwner({ id: 1 })
	await owner.items().where('price', '>', 100).where((group) => group.whereNull('expires_at').orWhereILike('title', '%DESK%')).get()
	// @ts-expect-error related model has no such column
	owner.items().whereLike('unknown_column', '%x%')

	LooseUser.where({}).where('anything', '=', new Date()).whereIn('whatever', [1, null, 'x'])
}

describe('write payload types', () => {
	it('keeps untyped models loose', () => {
		expectTypeOf<CreateAttributes<LooseUser>>().toEqualTypeOf<Record<string, unknown>>()
		expectTypeOf<WhereAttributes<LooseUser>>().toEqualTypeOf<Record<string, unknown>>()
		expectTypeOf<UpdateAttributes<LooseUser>>().toEqualTypeOf<Record<string, unknown>>()
		expectTypeOf<AttributeColumn<LooseUser>>().toEqualTypeOf<string>()
		expectTypeOf(assertLooseWritesRemainOpen).returns.resolves.toBeVoid()
	})

	it('infers declared columns without a Model type parameter', () => {
		expectTypeOf<ModelAttributes<TypedUser>>().toEqualTypeOf<{
			id?: number
			name: string
			email: string
			password: string
			role?: string
		}>()

		expectTypeOf<CreateAttributes<TypedUser>>().toEqualTypeOf<{
			name: string
			email: string
			password: string
			role?: string
		}>()

		expectTypeOf<AttributeColumn<TypedUser>>().toEqualTypeOf<'id' | 'name' | 'email' | 'password' | 'role'>()
	})

	it('types create / where / update from declared fields', () => {
		expectTypeOf(assertTypedWrites).returns.resolves.toBeVoid()
	})

	it('infers columns from interface merging', () => {
		expectTypeOf<CreateAttributes<MergedUser>>().toEqualTypeOf<{
			name: string
			email: string
		}>()
	})

	it('types filters on queries and relations while retaining untyped models', () => {
		expectTypeOf(assertTypedFilters).returns.resolves.toBeVoid()
	})
})
