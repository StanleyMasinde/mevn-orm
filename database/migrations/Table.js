/**
 * For Creating tables
 * 
 */
class Table {

    statement = ''
    /**
     * Int Primary Key
     * @param {String} name 
     */
    increments(name = 'id') {
        this.statement = `${name} INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY`
        return this
    }

    /**
     * Big int Primary key
     * @param {String} name 
     */
    bigIncrements(name = 'id') {
        this.statement = `${name} BigInt(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY`

        return this
    }

    /**
     * Created_at and updated_at columns
     */
    timestamps() {
        this.statement = "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +"," +"updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        return this
    }
    /**
     * Create the Varchar Column
     * @param {String} name 
     * @param {Number} length 
     */
    string(name, length = 191) {
        this.statement = `${name} VARCHAR(${length}) NOT NULL`

        return this
    }

    /**
     * Text Column
     * @param {String} name 
     */
    text(name) {
        this.statement = `${name} TEXT`

        return this
    }

    /***
     * ============================================================
     * Modifiers
     * ============================================================
     */

    /**
     * Unique value column
     */
    unique() {
        this.statement = `${this.statement} UNIQUE`
        return this
    }


}

module.exports = Table
