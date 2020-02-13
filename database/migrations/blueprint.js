/**
 * For Creating tables
 * 
 */
class BluePrint {


    /**
     * Int Primary Key
     * @param {String} name 
     */
    static increments(name = 'id') {

    }

    /**
     * Big int Primary key
     * @param {String} name 
     */
    static bigIncrements(name = 'id') {

    }

    /**
     * Created_at and deleted_at columns
     */
    static timestamps() {

    }
    /**
     * Create the Varchar Column
     * @param {String} name 
     * @param {Number} length 
     */
    static string(name, length = 191) {

    }

    /**
     * Text Column
     * @param {String} name 
     */
    static text(name) {

    }


}

module.exports = BluePrint
