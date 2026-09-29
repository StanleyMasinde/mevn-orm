import { describe, expectTypeOf, it } from 'vitest'
import { Model, joinRows } from '../../index.js'

class Item extends Model {
	declare name: string
	declare owner_id: number
}
class User extends Model {
	declare name: string
}
class Loose extends Model {}

function typedQuery() {
	return joinRows(Item, 'i')
		.leftJoin(User, { as: 'u', on: ['i.owner_id', '=', 'u.id'] })
		.project({ itemName: 'i.name', ownerName: 'u.name' })
}

function looseQuery() {
	return joinRows(Loose, 'l').project({ anything: 'l.anything' })
}

function checkInvalidTypes() {
	// @ts-expect-error a typed source has no missing column
	joinRows(Item, 'i').project({ invalid: 'i.missing' })
	// @ts-expect-error a typed filter requires the declared value type
	joinRows(Item, 'i').where('i.owner_id', '=', '1')
}

describe('joined row types', () => {
	it('infers declared values and nullable left-joined columns', () => {
		expectTypeOf<ReturnType<ReturnType<typeof typedQuery>['rows']>>().toEqualTypeOf<Promise<{ itemName: string, ownerName: string | null }[]>>()
		expectTypeOf<ReturnType<ReturnType<typeof looseQuery>['rows']>>().toEqualTypeOf<Promise<{ anything: unknown }[]>>()
		expectTypeOf(checkInvalidTypes).toBeFunction()
	})
})
