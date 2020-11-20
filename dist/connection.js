"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config_1 = require("./config/config");
const mysql_1 = tslib_1.__importDefault(require("mysql"));
const connection = mysql_1.default.createConnection({
    user: config_1.config.username,
    password: config_1.config.password,
    database: config_1.config.database,
    host: config_1.config.host
});
connection.connect();
connection.on('connect', (err) => {
    if (err) {
        console.log(err);
        throw new Error(err);
    }
    console.log('Connected');
});
exports.default = connection;
