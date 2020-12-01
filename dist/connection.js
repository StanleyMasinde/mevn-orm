"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const import_cwd_1 = tslib_1.__importDefault(require("import-cwd"));
const config = import_cwd_1.default('./knexfile');
const knex_1 = tslib_1.__importDefault(require("knex"));
console.log(process.cwd());
//@ts-ignore
const connection = knex_1.default(process.env.NODE_ENV === 'development' ? config.development : config.production);
exports.default = connection;
