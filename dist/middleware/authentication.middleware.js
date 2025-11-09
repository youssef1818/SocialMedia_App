"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphAuthorization = exports.authorization = exports.authentication = void 0;
const error_response_1 = require("../utils/response/error.response");
const token_security_1 = require("../utils/security/token.security");
const graphql_1 = require("graphql");
const authentication = (tokenType = token_security_1.TokenEnum.access) => {
    return async (req, res, next) => {
        if (!req.headers.authorization) {
            throw new error_response_1.BadRequestException("Validation Error", {
                key: "headers",
                issues: [{ path: ["authorization"], message: "Authorization required" }],
            });
        }
        const { decoded, user } = await (0, token_security_1.decodedToken)({
            authorization: req.headers.authorization,
        });
        req.user = user;
        req.decoded = decoded;
        next();
    };
};
exports.authentication = authentication;
const authorization = (accessRoles = [], tokenType = token_security_1.TokenEnum.access) => {
    return async (req, res, next) => {
        if (!req.headers.authorization) {
            throw new error_response_1.BadRequestException("Validation Error", {
                key: "headers",
                issues: [{ path: ["authorization"], message: "Missing Authorization " }],
            });
        }
        const { decoded, user } = await (0, token_security_1.decodedToken)({
            authorization: req.headers.authorization,
            tokenType,
        });
        if (!accessRoles.includes(user.role)) {
            throw new error_response_1.ForbiddenException("Not Authorized Account");
        }
        req.user = user;
        req.decoded = decoded;
        next();
    };
};
exports.authorization = authorization;
const graphAuthorization = async (accessRoles = [], role) => {
    if (!accessRoles.includes(role)) {
        throw new graphql_1.GraphQLError("Not Authorized Account", {
            extensions: { statusCode: 403 },
        });
    }
};
exports.graphAuthorization = graphAuthorization;
