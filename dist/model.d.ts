export default class Model {
    table: String;
    name: any;
    static table: any;
    attributes: any;
    constructor(attributes: any);
    /**
     * The models table name
     * eg Movie will automatically be movies
     * @returns String
     */
    static tableName(): any;
    /**
     * Get the Model count
     */
    static count(): Promise<{
        [k: string]: string | number;
    }[]>;
    /**
     * Get all rows from the database
     *
     * @returns Promise<>
     */
    static all(): Promise<Error | any[]>;
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
    static delete(id: number): Promise<number | Error>;
    /**
     * Create a new Model
     * @param attributes
     */
    static create(attributes?: any[]): Promise<Error | number[]>;
}
