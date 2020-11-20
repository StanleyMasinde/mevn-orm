declare const _default: {
    development: {
        client: string;
        connection: {
            filename: string;
        };
        useNullAsDefault: boolean;
        migrations: {
            tableName: string;
        };
    };
    staging: {
        client: string;
        connection: {
            database: string;
            user: string;
            password: string;
        };
        pool: {
            min: number;
            max: number;
        };
        migrations: {
            tableName: string;
        };
    };
    production: {
        client: string;
        connection: {
            database: string;
            user: string;
            password: string;
        };
        pool: {
            min: number;
            max: number;
        };
        migrations: {
            tableName: string;
        };
    };
};
export default _default;
