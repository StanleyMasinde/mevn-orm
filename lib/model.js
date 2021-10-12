const knex = require('knex').knex
const { development, staging, production } = require(process.cwd() + '/knexfile.js')
const pluralize = require('pluralize')
let config
switch (process.env.NODE_ENV) {
case 'testing':
	config = development
	break
case 'development':
	config = development
	break
case 'staging':
	config = staging
	break
default:
	config = production
	break
}
const DB = knex(config)
class Model {
	#private
	static currentTable = pluralize(this.name.toLowerCase())
	static currentQuery
	constructor(properties) {
		for (const key in properties) {
			this[key] = properties[key]
		}
		this.fillable = []
		this.hidden = []
		this.#private = ['fillable', 'hidden']
		this.modelName = this.constructor.name.toLowerCase()
		this.table = pluralize(this.constructor.name.toLowerCase())
	}

	/**
	 * Save a model to the database
	 */
	async save() {
		try {
			let rows = {}
			this.fillable.forEach((f) => {
				rows[f] = this[f]
			})
			const id = await DB(this.table)
				.insert(rows)
			const fields = await DB(this.table).where({ id }).first()
			for (const f in fields) {
				this[f] = fields[f]
			}
			return this.stripColumns(this)
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * Update a model
	 * @param {*} properties
	 * @returns this
	 */
	async update(properties) {
		try {
			const id = await DB(this.table)
				.where({ id: this.id })
				.update(properties)
			const fields = await DB(this.table).where({ id }).first()
			// console.log(fields)
			return this.stripColumns(new this.constructor(fields))
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * Delete a model
	 * @returns this
	 */
	async delete() {
		try {
			await DB(this.table)
				.where({ id: this.id })
				.del()
			return
		} catch (error) {
			throw new Error(error)
		}
	}


	/**
	 * Update a model
	 * @param {*} properties
	 * @returns
	 */
	static async update(properties) {
		try {
			if (!this.currentQuery) {
				const rows = await DB(this.table).update(properties)
				return rows
			}
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * Delete a model
	 * @returns
	 */
	static async destroy() {
		try {
			if (!this.currentQuery) {
				const rows = await DB(this.table).delete()
				return rows
			}
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * Find a model
	 * @param {*} id
	 * @param {*} columns
	 * @returns this
	 */
	static async find(id, columns = '*') {
		const table = pluralize(this.name.toLowerCase())
		try {
			const fields = await DB(table)
				.where({ id })
				.first(columns)
			if (fields) {
				return new this(fields)
			}
			return null
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * Create a new model
	 * @param {*} properties
	 * @returns this
	 */
	static async create(properties) {
		const table = pluralize(this.name.toLowerCase())
		try {
			const fields = await DB(table)
				.insert(properties)
			const record = await DB(table).where({ id: fields[0] }).first()
			const model = new this(record)
			return model.stripColumns(model)
		} catch (error) {
			throw new Error(error)
		}
	}

	/**
	 * --------------|
	 * Relationships |
	 * --------------|
	 */

	/**
	 * One to one relationship
	 * @param {*} related 
	 */
	async hasOne(Related, localKey, foreignKey) {
		const table = new Related().table
		const relation = {}
		if (!localKey) {
			localKey = this.id
		}
		if (!foreignKey) {
			foreignKey = `${this.modelName}_id`
		}
		relation[foreignKey] = localKey
		const res = await DB(table).where(relation).first()
		if (res) {
			return this.stripColumns(new Related(res))
		}
		return null
	}
	// hasMany(related) {}
	// hasManyThrough(related) {}
	// belongsTo(related) {}
	// belongsToMany(related) {}

	/**
	 * Where condition
	 * @param {*} conditions 
	 * @returns 
	 */
	static where(conditions = {}) {
		const table = pluralize(this.name.toLowerCase())
		this.currentQuery = DB(table).where(conditions)
		return this
	}

	/*ß
	 * Return the first model
	 * @param {*} columns 
	 */
	static async first(columns = '*') {
		try {
			if (!this.currentQuery) {
				const rows = await DB(this.table).first(columns)
				if (rows) {
					return new this(rows)
				}
				return null
			}
			const rows = await this.currentQuery.first(columns)
			if (rows) {
				return new this(rows)
			}
			return null
		} catch (error) {
			throw new Error(error)
		}
	}


	/**
	 * Delete columns that are not needed
	 * 
	 */
	stripColumns(Model) {
		this.#private.concat(this.hidden).forEach((h) => {
			delete Model[h]
		})
		return Model
	}

}
module.exports = { Model, DB }
