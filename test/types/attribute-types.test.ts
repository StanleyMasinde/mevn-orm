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
})
