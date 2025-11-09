"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyForgotPasswordCode = exports.sendForgotPasswordCode = exports.confirmEmail = exports.signupWithGmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
    }),
};
exports.signup = {
    body: exports.login.body
        .extend({
        username: validation_middleware_1.generalFields.username,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
    }),
};
exports.signupWithGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string(),
    }),
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.sendForgotPasswordCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
    }),
};
exports.verifyForgotPasswordCode = {
    body: exports.sendForgotPasswordCode.body.extend({
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.resetPassword = {
    body: exports.verifyForgotPasswordCode.body.extend({
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
    })
};
