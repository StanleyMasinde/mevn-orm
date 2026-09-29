import { AsyncLocalStorage } from 'node:async_hooks'
import type { Backend, TableQuery } from './backend.js'

/** A live transaction backend; its models and queries cannot run after disposal. */
class ExecutionContext {
	private active = true
	readonly backend: Backend

	constructor(raw: Backend) {
		this.backend = {
			query: (table) => {
				this.assertActive()
				return guardQuery(raw.query(table), this)
			},
			...(raw.transaction && { transaction: <T>(callback: (backend: Backend) => Promise<T>) => {
				this.assertActive()
				return raw.transaction!(callback)
			} }),
		}
	}

	assertActive(): void {
		if (!this.active) throw new Error('Transaction context has completed')
	}

	dispose(): void {
		this.active = false
	}
}

const storage = new AsyncLocalStorage<ExecutionContext>()
const boundModels = new WeakMap<object, ExecutionContext>()

const currentContext = (): ExecutionContext | undefined => storage.getStore()

const withContext = <T>(context: ExecutionContext, callback: () => T): T => {
	context.assertActive()
	return storage.run(context, callback)
}

const bindModel = <T extends object>(model: T, context: ExecutionContext | undefined): T => {
	if (context) {
		context.assertActive()
		const previous = boundModels.get(model)
		if (previous && previous !== context) throw new Error('Model is already bound to another transaction')
		boundModels.set(model, context)
	}
	return model
}

const modelContext = (model: object): ExecutionContext | undefined => boundModels.get(model)

const guardQuery = (raw: TableQuery, context: ExecutionContext): TableQuery => new Proxy(raw, {
	get(target, property, receiver) {
		const value = Reflect.get(target, property, target)
		if (typeof value !== 'function') return value
		return (...args: unknown[]) => {
			context.assertActive()
			const result = value.apply(target, args)
			if (property === 'clone') return guardQuery(result as TableQuery, context)
			return result === target ? receiver : result
		}
	},
})

export { ExecutionContext, currentContext, withContext, bindModel, modelContext }
