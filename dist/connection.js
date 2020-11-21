"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const knexfile_1 = tslib_1.__importDefault(require("./config/knexfile"));
const knex_1 = tslib_1.__importDefault(require("knex"));
const connection = knex_1.default(process.env.NODE_ENV === 'development' ? knexfile_1.default.development : knexfile_1.default.production);
exports.default = connection;
