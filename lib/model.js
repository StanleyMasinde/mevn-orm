const { development, staging, production } = require('../knexfile')
const pluralize = require('pluralize')
let config
switch (process.env.NODE_ENV) {
case 'development':
	config = development
	break
case 'stagin':
	config = staging
	break
default:
	config = production
	break
}
const DB = require('knex')(config)
class Model {
	#private
	static table = pluralize(this.name.toLowerCase())
	static currentQuery
	constructor(properties) {
		for (const key in properties) {
			this[key] = properties[key]
		}
		this.fillable = []
		this.hidden = []
		this.#private = ['fillable', 'hidden', 'table']
		this.modelName = this.constructor.name.toLowerCase()
		this.table = pluralize(this.modelName)
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
			console.log(error)
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
		this.currentQuery = DB(pluralize(this.name.toLowerCase()))
			.where(conditions)
		return this
	}

	/*ß
	 * Return the first model
	 * @param {*} columns 
	 */
	static async first(columns) {
		try {
			if (!this.currentQuery) {
				const rows = await DB(this.table).first(columns)
				return new this(rows)
			}
		} catch (error) {
			console.log(error)
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
module.exports = Model
