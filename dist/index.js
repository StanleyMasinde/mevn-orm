"use strict";
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
dotenv_1.default.config();
const model_1 = tslib_1.__importDefault(require("./model"));
const user_1 = tslib_1.__importDefault(require("./user"));
module.exports = {
    Model: model_1.default, User: user_1.default
};
