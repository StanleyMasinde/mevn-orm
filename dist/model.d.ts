export default class Model {
    config: any;
    table: String;
    name: any;
    static table: any;
    constructor(config: any);
    static tableName(): any;
    static all(): Promise<any[]>;
}
