export default class Model {
    config: any;
    table: String;
    name: any;
    static table: any;
    constructor(config: any);
    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName(): any;
    /**
     * Get all rows from the database
     *
     * @returns Promise<>
     */
    static all(): Promise<any[]>;
    /**
     * Get the first record for the database
     *
     * @returns Promise
     */
    static first(): Promise<any>;
    /**
     * Find model by Id
     * @param id
     */
    static find(id: number): Promise<any>;
    /**
     * Delete a model from the database
     * @param id
     */
    static delete(id: number): Promise<number>;
}
