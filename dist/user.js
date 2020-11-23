"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const model_1 = tslib_1.__importDefault(require("./model"));
class User extends model_1.default {
    constructor(config) {
        super(config);
    }
}
exports.default = User;
