"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteAccount = exports.restoreAccount = exports.freezeAccount = exports.changeRole = exports.acceptFriendRequest = exports.sendFriendRequest = exports.logout = exports.welcome = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
const User_model_1 = require("../../DB/model/User.model");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.welcome = zod_1.z.object({
    name: zod_1.z.string().min(2),
});
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum(token_security_1.LogoutEnum).default(token_security_1.LogoutEnum.only)
    }),
};
exports.sendFriendRequest = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id,
    }),
};
exports.acceptFriendRequest = {
    params: zod_1.z.strictObject({
        requestId: validation_middleware_1.generalFields.id,
    }),
};
exports.changeRole = {
    params: exports.sendFriendRequest.params,
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(User_model_1.RoleEnum),
    }),
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional(),
    }).optional().refine((data) => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, {
        error: "invalid userId format",
        path: ["userId"],
    }),
};
exports.restoreAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string(),
    }).refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data.userId);
    }, {
        error: "invalid userId format",
        path: ["userId"],
    }),
};
exports.hardDeleteAccount = exports.restoreAccount;
