/**
 * For Creating rows in a table
 * 
 */
class Table {

    /**
     * The possible column modifiers.
     *
     * @var array
     */
    modifiers = [
        'Unsigned', 'Charset', 'Collate', 'VirtualAs', 'StoredAs', 'Nullable',
        'Default', 'Increment', 'Comment', 'After', 'First', 'Srid',
    ];

    /**
     * The possible column serials.
     *
     * @var array
     */
    serials = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger'];

    /**
     * Current statement
     * 
     * @var array
     */
    statement = ''

    /**
     * Int Primary Key
     * @param {String} name 
     */
    increments(name = 'id') {
        this.statement = `${name} INT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
        return this
    }

    /**
     * Big int Primary key
     * @param {String} name 
     */
    bigIncrements(name = 'id') {
        this.statement = `${name} BigInt UNSIGNED AUTO_INCREMENT PRIMARY KEY`
        return this
    }

    /**
     * Tiny integer column
     * @param {*} name 
     */
    tinyInteger(name = '') {
        this.statement = `${name} TINYINT`
        return this
    }

    /**
     * Small Integer column
     * @param {*} name 
     */
    smallInteger(name = '') {
        this.statement = `${name} SMALLINT`
        return this
    }

    /**
     * Int column
     * @param {*} name 
     */
    integer(name = '') {
        this.statement = `${name} INT`
        return this
    }

    /**
     * Medium Int column
     * @param {*} name 
     */
    mediumInteger(name = '') {
        this.statement = `${name} MEDIUMINT`
        return this
    }

    /**
     * Decimal column
     * @param {*} name 
     */
    decimal(name = '') {
        this.statement = `${name} DECIMAL`
        return this
    }

    /**
     * Float column
     * @param {*} name 
     */
    float(name = '') {
        this.statement = `${name} FLOAT`
        return this
    }

    /**
     * Double column
     * @param {*} name 
     */
    double(name = '') {
        this.statement = `${name} DOUBLE`
        return this
    }

    /**
     * Real column
     * @param {*} name 
     */
    real(name = '') {
        this.statement = `${name} REAL`
        return this
    }

    /**
     * Medium Int column
     * @param {*} name 
     */
    bool(name = '') {
        this.statement = `${name} BOOLEAN`
        return this
    }

    /**
     * Created_at and updated_at columns
     */
    timestamps() {
        this.statement = "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" + "," + "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        return this
    }
    /**
     * Create the Varchar Column
     * @param {String} name 
     * @param {Number} length 
     */
    string(name = '', length = 255) {
        this.statement = `${name} VARCHAR(${length}) NOT NULL`

        return this
    }

    /**
     * Text Column
     * @param {String} name 
     */
    text(name = '') {
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

    /**
     * Create a NULL column
     */
    nullable() {
        this.statement = `${this.statement} NULL DEFAULT NULL`
        return this
    }

}

module.exports = Table
