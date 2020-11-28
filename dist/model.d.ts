export default class Model {
    table: String;
    name: any;
    static table: any;
    attributes: any;
    constructor(attributes: any);
    static tableName(): any;
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
    /**
     * Create a new Model
     * @param attributes
     */
    static create(attributes?: any[]): Promise<number[]>;
}
