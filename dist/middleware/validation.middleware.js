"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalFields = exports.graphValidation = exports.validation = void 0;
const zod_1 = require("zod");
const error_response_1 = require("./../utils/response/error.response");
const mongoose_1 = require("mongoose");
const graphql_1 = require("graphql");
const validation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            if (req.file) {
                req.body.attachment = req.file;
            }
            if (req.files) {
                req.body.attachments = req.files;
            }
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const errors = validationResult.error;
                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => ({
                        message: issue.message,
                        path: issue.path,
                    })),
                });
            }
        }
        if (validationErrors.length) {
            throw new error_response_1.AppError("Validation failed", 400, {
                validationErrors,
            });
        }
        return next();
    };
};
exports.validation = validation;
const graphValidation = async (schema, args) => {
    const validationResult = await schema.safeParseAsync(args);
    if (!validationResult.success) {
        const ZError = validationResult.error;
        throw new graphql_1.GraphQLError("validation Error", {
            extensions: {
                statusCode: 400,
                issues: {
                    key: "args",
                    issues: ZError.issues.map((issue) => {
                        return { message: issue.message, path: issue.path };
                    }),
                },
            },
        });
    }
};
exports.graphValidation = graphValidation;
exports.generalFields = {
    username: zod_1.z.string().min(3).max(30),
    email: zod_1.z.email("Invalid email format"),
    otp: zod_1.z.string().regex(/^\d{6}$/),
    password: zod_1.z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, {
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit",
    }),
    confirmPassword: zod_1.z.string(),
    file: function (mimetype) {
        return zod_1.z
            .strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            size: zod_1.z.number(),
        })
            .refine((data) => {
            return data.buffer || data.path;
        }, { error: "neither buffer nor path is provided", path: ["file"] });
    },
    id: zod_1.z.string().refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data);
    }, { error: "invalid objectId format" }),
};
