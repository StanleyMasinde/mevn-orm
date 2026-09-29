import { describe, expectTypeOf, it } from 'vitest'
import {
	Model,
	ModelCollection,
	ModelQuery,
	transaction,
	type TransactionContext,
} from '../../index.js'

class Item extends Model {
	declare name: string
	declare price: number
	override fillable = ['name', 'price']

	notes() {
		return this.hasMany(Note)
	}
}

class Note extends Model {
	declare item_id: number
	declare body: string
}

class LooseItem extends Model {}

async function assertTransactionTypes(tx: TransactionContext) {
	const facade = tx.model(Item)
	const created = await facade.create({ name: 'Desk', price: 100 })
	expectTypeOf(created).toEqualTypeOf<Item>()
	expectTypeOf(created.notes()).toMatchTypeOf<ReturnType<Item['notes']>>()
	expectTypeOf(await facade.find(1)).toEqualTypeOf<Item | null>()
	expectTypeOf(await facade.findOrFail(1)).toEqualTypeOf<Item>()
	expectTypeOf(await facade.all()).toEqualTypeOf<ModelCollection<Item>>()
	expectTypeOf(facade.where({ price: 100 })).toEqualTypeOf<ModelQuery<Item>>()
	expectTypeOf(facade.query().forUpdate()).toEqualTypeOf<ModelQuery<Item>>()
	expectTypeOf(facade.make({ name: 'Desk' })).toEqualTypeOf<Item>()
	expectTypeOf(tx.bind(new Item())).toEqualTypeOf<Item>()
	expectTypeOf(await facade.firstOrCreate({ name: 'Desk' }, { price: 100 })).toEqualTypeOf<Item>()
	// @ts-expect-error declared model has no such column
	facade.where({ nme: 'Desk' })
	// @ts-expect-error required typed create attributes are missing
	await facade.create({ name: 'Desk' })

	const loose = await tx.model(LooseItem).create({ arbitrary: true })
	expectTypeOf(loose).toEqualTypeOf<LooseItem>()
	expectTypeOf(await tx.transaction(async (nested) => nested.model(Item).count())).toEqualTypeOf<number>()
	expectTypeOf(transaction(async (scope) => scope.model(Item).count())).toEqualTypeOf<Promise<number>>()
}

describe('transaction facade types', () => {
	it('preserves derived and untyped model signatures', () => {
		expectTypeOf(assertTransactionTypes).returns.resolves.toBeVoid()
	})
})
