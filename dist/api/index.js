"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const server_1 = __importDefault(require("../src/server"));
const serverless_http_1 = __importDefault(require("serverless-http"));
const handler = (0, serverless_http_1.default)(server_1.default);
async function default_1(req, res) {
    return handler(req, res);
}
