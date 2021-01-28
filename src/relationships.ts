import queryBuilder from './connection'
import pluralize from 'pluralize'

let relationships = {
    /**
     * -----------------------------------------------
     *               Relationships
     * -----------------------------------------------
     */

    /**
     * Relationships to load this the current model
     * @param {Array} relations 
     */
    load(relations: Array<any> = []) {
        this.collection[this.modelName] = this.currentModel
        relations.forEach(function (relation: string | number) {
            const rows = this[relation]()
            this.collection[this.modelName][relation] = rows
        }, this)

        return this
    },

    /**
     * Define a HasOne relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    async hasOne(related: string, primaryKey: number | any = null, foreignKey: number | any = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id

        return await queryBuilder
            .table(pluralize(related.toLowerCase()))
            // in the form of model_id
            .where(fk, pk)
            .first()
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    },

    /**
     * Define a reverse has one relationship
     * @param {String} related 
     * @param {String} primaryKey 
     * @param {String} foreignKey 
     */
    async belongsTo(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id
        return await queryBuilder
            .table(this.table)
            // in the form of model_id
            .where(fk, pk)
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    },

    /**
     * Define a Many to many relationship relationship
     * @param {String} related 
     */
    belongsToMany(related: string, primaryKey: string = null, foreignKey: string = null) {
        // look for a pivot table
        // eg Farmer has many Crops crop_farmer is the table
        // We'll use class names ['This Class, Related Class'].sort
        const relatedName = related.toLowerCase()
        const pivotTable = [this.modelName, relatedName].sort().join('_')
        const firstCol = `${this.modelName}_id`
        const secondCol = `${relatedName}_id`

        // TODO Honestly I believe there is a better way
        // Gets the related IDs from the pivot table
        const firstQuery = queryBuilder
            .table(pivotTable)
            .where(firstCol, this.id)
            .select(secondCol)
            .toQuery()

        // Get the records for the other table
        return firstQuery
    },

    /**
         * Define a HasMany relationship
         * @param {String} related 
         * @param {String} primaryKey 
         * @param {String} foreignKey 
         */
    async hasMany(related: string, primaryKey: string = null, foreignKey: string = null) {
        // I should get a query to get related records
        const fk = foreignKey || this.foreignKey
        const pk = primaryKey || this.id

        return await queryBuilder
            .table(pluralize(related.toLowerCase()))
            .where(fk, pk)
            .select('*')
            .asCallback((err: any, rows: any) => {
                if (err) {
                    throw err
                }
                return rows
            })
    },

    /**
     * MorphOne relationship
     * @param {String} related the class name of the other model
     * @param {String} reference the reference column in the other model
     */
    async morphOne(related: String, reference: String) {
        const foreign_id = `${reference}_id`
        const foreign_type = `${this.modelName}_type`

        let condition = {}
        condition[`${reference}_id`] = this.id
        condition[`${reference}_type`] = this.constructor.name

        const table = pluralize(related.toLocaleLowerCase())
        return await queryBuilder.table(table)
            .where(condition)
            .first()
    },

    /**
     * MorphMany relationship
     * @param {String} related the class name of the other model
     * @param {String} reference the reference column in the other model
     */
    async morphMany(related: String, reference: String) {
        const foreign_id = `${reference}_id`
        const foreign_type = `${this.modelName}_type`

        let condition = {}
        condition[`${reference}_id`] = this.id
        condition[`${reference}_type`] = this.constructor.name

        const table = pluralize(related.toLocaleLowerCase())
        return await queryBuilder.table(table)
            .where(condition)
            .select()
    }
}

export default relationships
