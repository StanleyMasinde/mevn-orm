"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const knexfile_1 = tslib_1.__importDefault(require("./config/knexfile"));
const { development, production } = knexfile_1.default;
const knex_1 = tslib_1.__importDefault(require("knex"));
const connection = knex_1.default(process.env.NODE_ENV === 'development' ? development : production);
exports.default = connection;
